/** A batch of fixed ticks as one update: same result as the same number of single ticks, but stops on an alarm. */
import { newAlarms } from "./Alarms"
import PowerPlantState from "./PowerPlantState"
import PowerPlantTick from "./PowerPlantTick"

export type BatchResult = { state: PowerPlantState; ticksRun: number }

// Runs up to `count` ticks and stops on the tick where an alarm comes on (that tick is included)
export function runTicks(state: PowerPlantState, count: number): BatchResult {
  let current: PowerPlantState = state
  let ticksRun = 0
  while (ticksRun < count) {
    const next: PowerPlantState = PowerPlantTick(current)
    ticksRun++
    const raised: boolean = newAlarms(current, next).length > 0
    current = next
    if (raised) break
  }
  return { state: current, ticksRun }
}
