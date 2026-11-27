/**
 * Emergency power chain (#196, ADR 0056, ADR 0055): Grid → Aux → [Aux→Vital breaker] → Vital → [Vital→Safety breaker] → Safety ◄ UPS.
 * The changeover to the emergency source is automatic, the hand-back is manual. The Aux→Vital breaker opens by itself on a dead Auxiliary
 * bus; the Vital→Safety breaker opens by itself on a dead Vital bus, and the battery (its breaker is derived: closed = Vital→Safety open)
 * takes the Safety bus in the same tick. The charge drains while the battery feeds and recharges only with Vital→Safety closed on a live
 * Vital bus; at 0% with the Vital bus dead the simulation ends.
 */
import { isBusLive } from "./AuxiliaryBus"
import { CstSimulation, CstUps } from "./const"
import PowerPlantState from "./PowerPlantState"

// The Vital bus (controller controls, readouts, annunciator): the Aux→Vital breaker closed on a live Auxiliary bus
export const isVitalBusLive = (state: PowerPlantState): boolean => state.vitalFeedBreaker && isBusLive(state)

// The Vital bus feeds the Safety bus: Vital→Safety closed on a live Vital bus
const isFedThroughVital = (state: PowerPlantState): boolean => state.safetyFeedBreaker && isVitalBusLive(state)

// The battery feeds the Safety bus: the Vital→Safety breaker open (the derived battery breaker closed) and charge left. A Vital bus that just
// died with Vital→Safety still closed counts as open, so there is no gap before the tick opens it.
export const isBatteryFeeding = (state: PowerPlantState): boolean => !isFedThroughVital(state) && state.upsCharge > 0

// The Safety bus (breaker control power, the reset coils): through Vital→Safety from a live Vital bus, or from the battery
export const isSafetyBusLive = (state: PowerPlantState): boolean => isFedThroughVital(state) || isBatteryFeeding(state)

// The automatic changeover, applied at the start of every tick: a breaker opens when the bus it takes from is dead, top down, never closes
export function settleEmergencyChain(state: PowerPlantState): PowerPlantState {
  const vitalFeedBreaker: boolean = state.vitalFeedBreaker && isBusLive(state)
  const safetyFeedBreaker: boolean = state.safetyFeedBreaker && vitalFeedBreaker
  if (vitalFeedBreaker === state.vitalFeedBreaker && safetyFeedBreaker === state.safetyFeedBreaker) return state
  return { ...state, vitalFeedBreaker, safetyFeedBreaker }
}

// The UPS charge after one tick, 0-100: one fixed rate each way, set by the breakers at the start of the tick
export function upsChargeAfter(state: PowerPlantState): number {
  const { DeltaTime } = CstSimulation
  if (!isFedThroughVital(state)) return Math.max(0, state.upsCharge - (100 / CstUps.NominalRuntime) * DeltaTime)
  return Math.min(100, state.upsCharge + (100 / CstUps.RechargeTime) * DeltaTime)
}
