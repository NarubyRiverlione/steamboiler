/**
 * Onsite diesel generator (#169, ADR 0053): a third supply for the auxiliary bus, for a dark start. No shaft: running, it holds
 * 50 Hz up to its rating. RUN is starting for CstDiesel.StartTime, then running; starting needs no plant bus. The stiffer source
 * carries the bus (grid over generator over diesel), so the diesel carries the auxiliary load only as the sole supply, and then
 * its breaker opens on that tick when the load passes the rating (not a latched trip; the diesel keeps running).
 */
import { isAtSyncSpeed } from "../utils/turbineCalculations"
import { auxiliaryLoadOf } from "./AuxiliaryLoad"
import { CstDiesel, CstSimulation } from "./const"
import PowerPlantState, { DieselState } from "./PowerPlantState"

// The diesel is the sole supply: the grid supply breaker and the generator breaker are open
export const isDieselSole = ({ gridSupplyBreaker, dieselBreaker, Turbine }: PowerPlantState): boolean =>
  dieselBreaker && !gridSupplyBreaker && !Turbine.generatorBreaker

// The diesel's output in MW: the auxiliary load while it is the sole supply, otherwise it runs unloaded
export const dieselOutput = (state: PowerPlantState): number => (isDieselSole(state) ? auxiliaryLoadOf(state) : 0)

// Why the diesel breaker cannot close, or undefined when it can. Onto a dead bus or a grid-fed bus: free while running; onto a bus fed
// by the generator alone only inside the ±2 rpm window (an interlock). Opening is never refused.
export function dieselBreakerCloseRefusal(state: PowerPlantState): string | undefined {
  if (state.dieselBreaker) return undefined
  if (state.Diesel.status !== "running") return state.Diesel.status === "starting" ? "The diesel is still starting" : "The diesel is not running"
  const generatorAlone: boolean = state.Turbine.generatorBreaker && !state.gridSupplyBreaker
  return generatorAlone && !isAtSyncSpeed(state.Turbine.rpm) ? "Speed is outside the synchronising window" : undefined
}

// The one open path: the normal open, the STOP and the local trip all use it
export const openDieselBreaker = (state: PowerPlantState): PowerPlantState => (state.dieselBreaker ? { ...state, dieselBreaker: false } : state)

const advance = ({ status, startElapsed }: DieselState): DieselState => {
  if (status !== "starting") return { status, startElapsed: 0 }
  const elapsed: number = startElapsed + CstSimulation.DeltaTime
  // Summed 0.1 s ticks drift by a float epsilon
  return elapsed >= CstDiesel.StartTime - 1e-9 ? { status: "running", startElapsed: 0 } : { status, startElapsed: elapsed }
}

// One tick: the start progresses, and a sole-supply diesel past its rating opens its breaker
export function DieselTick(state: PowerPlantState): PowerPlantState {
  const overloaded: boolean = isDieselSole(state) && auxiliaryLoadOf(state) > CstDiesel.RatedPower
  return { ...(overloaded ? openDieselBreaker(state) : state), Diesel: advance(state.Diesel) }
}
