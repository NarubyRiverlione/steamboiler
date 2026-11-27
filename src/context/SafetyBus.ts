/**
 * Emergency power chain (#196, ADR 0056, ADR 0055): Grid → Aux → [Aux→Vital breaker] → Vital → [Vital→Safety breaker] → Safety ◄ UPS.
 * The changeover to the emergency source is automatic, the hand-back is manual. The Aux→Vital breaker opens by itself on a dead Auxiliary
 * bus; the Vital→Safety breaker opens by itself on a dead Vital bus, and the battery (its breaker is derived: closed = Vital→Safety open)
 * takes the Safety bus in the same tick. The charge drains while the battery feeds and recharges only with Vital→Safety closed on a live
 * Vital bus; at 0% with the Vital bus dead the simulation ends.
 */
import { isBusLive } from "./AuxiliaryBus"
import { isVitalFedByAux } from "./EmergencyDiesel"
import { CstSimulation, CstUps } from "./const"
import PowerPlantState from "./PowerPlantState"

// The Vital bus (controller controls, readouts, annunciator): fed by the Auxiliary bus through Aux→Vital, or by the EMY diesel through its breaker (#198)
export const isVitalBusLive = (state: PowerPlantState): boolean => isVitalFedByAux(state) || state.emyBreaker

// The Vital bus feeds the Safety bus: Vital→Safety closed on a live Vital bus
const isFedThroughVital = (state: PowerPlantState): boolean => state.safetyFeedBreaker && isVitalBusLive(state)

// The battery feeds the Safety bus: the Vital→Safety breaker open (the derived battery breaker closed) and charge left. A Vital bus that just
// died with Vital→Safety still closed counts as open, so there is no gap before the tick opens it.
export const isBatteryFeeding = (state: PowerPlantState): boolean => !isFedThroughVital(state) && state.upsCharge > 0

// The Safety bus (breaker control power, the reset coils): through Vital→Safety from a live Vital bus, or from the battery
export const isSafetyBusLive = (state: PowerPlantState): boolean => isFedThroughVital(state) || isBatteryFeeding(state)

// The automatic changeover at the start of every tick, top down: breakers open on a dead source, the EMY breaker closes by itself (ADR 0056)
export function settleEmergencyChain(state: PowerPlantState): PowerPlantState {
  const vitalFeedBreaker: boolean = state.vitalFeedBreaker && isBusLive(state)
  const fedByAux: boolean = vitalFeedBreaker
  const emyBreaker: boolean = state.EmergencyDiesel.status === "running" && !fedByAux
  const safetyFeedBreaker: boolean = state.safetyFeedBreaker && (fedByAux || (state.emyBreaker && emyBreaker))
  if (vitalFeedBreaker === state.vitalFeedBreaker && safetyFeedBreaker === state.safetyFeedBreaker && emyBreaker === state.emyBreaker) return state
  return { ...state, vitalFeedBreaker, safetyFeedBreaker, emyBreaker }
}

// The UPS charge after one tick, 0-100: one fixed rate each way, set by the breakers at the start of the tick
export function upsChargeAfter(state: PowerPlantState): number {
  const { DeltaTime } = CstSimulation
  if (!isFedThroughVital(state)) return Math.max(0, state.upsCharge - (100 / CstUps.NominalRuntime) * DeltaTime)
  return Math.min(100, state.upsCharge + (100 / CstUps.RechargeTime) * DeltaTime)
}
