/**
 * Emergency (EMY) diesel (#198, ADR 0056): a standby set that takes the Vital bus when the Auxiliary bus is lost. Selector OFF never
 * starts it, AUTO starts it on a dead Vital bus and keeps it running until the operator moves the selector to OFF and back, ON is the
 * test run. After the start time a fixed warm-up (a timer) lights Ready to close, the interlock on the Vital→Safety breaker while the
 * EMY diesel feeds the Vital bus. No rating, no overload: the Vital loads are not metered.
 */
import { isBusLive } from "./AuxiliaryBus"
import { CstEmergencyDiesel, CstSimulation } from "./const"
import PowerPlantState, { EmergencyDieselState } from "./PowerPlantState"

// The Auxiliary bus feeds the Vital bus: Aux→Vital closed on a live Auxiliary bus
export const isVitalFedByAux = (state: PowerPlantState): boolean => state.vitalFeedBreaker && isBusLive(state)

// The Vital bus is fed by the EMY diesel: its breaker closed and the Auxiliary bus not feeding it
export const isVitalFedByEmy = (state: PowerPlantState): boolean => state.emyBreaker && !isVitalFedByAux(state)

// The warm-up is done: the set runs and the timer reached WarmUpTime
export const isEmyWarmedUp = ({ EmergencyDiesel: { status, warmupElapsed } }: PowerPlantState): boolean => status === "running" && warmupElapsed >= CstEmergencyDiesel.WarmUpTime - 1e-9

// The Ready to close lamp, the interlock of Vital→Safety: always with the Auxiliary bus as source, after the warm-up on the EMY diesel
export const isReadyToClose = (state: PowerPlantState): boolean => !isVitalFedByEmy(state) || isEmyWarmedUp(state)

const advance = ({ status, startElapsed, warmupElapsed }: EmergencyDieselState): EmergencyDieselState => {
  const { DeltaTime } = CstSimulation
  if (status === "running") return { status, startElapsed: 0, warmupElapsed: warmupElapsed + DeltaTime }
  if (status !== "starting") return { status, startElapsed: 0, warmupElapsed: 0 }
  const elapsed: number = startElapsed + DeltaTime
  // Summed 0.1 s ticks drift by a float epsilon
  return elapsed >= CstEmergencyDiesel.StartTime - 1e-9 ? { status: "running", startElapsed: 0, warmupElapsed: 0 } : { status, startElapsed: elapsed, warmupElapsed: 0 }
}

// One tick: the selector starts or stops the set (AUTO only on a dead Vital bus, never stopping it), then the start and warm-up progress
export function EmergencyDieselTick(state: PowerPlantState): PowerPlantState {
  const { emySelector, EmergencyDiesel } = state
  const stop: boolean = emySelector === "OFF"
  const start: boolean = emySelector === "ON" || (emySelector === "AUTO" && !(isVitalFedByAux(state) || isVitalFedByEmy(state)))
  const selected: EmergencyDieselState =
    stop ? { status: "stopped", startElapsed: 0, warmupElapsed: 0 } : start && EmergencyDiesel.status === "stopped" ? { ...EmergencyDiesel, status: "starting" } : EmergencyDiesel
  return { ...state, EmergencyDiesel: advance(selected) }
}
