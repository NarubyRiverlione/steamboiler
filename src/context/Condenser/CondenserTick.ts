import { CondenserState } from "./CondenserTypes"
import { calculatePressure } from "../../utils/condenserCalculation"

/**
 * Simulates the condenser vacuum behavior over time
 *
 * @param condenserState Current condenser state
 * @param boilerSteamFlow Steam flow from the boiler (kg/s)
 * @param deltaTime Time elapsed since last tick (seconds)
 * @returns Action to update the condenser state
 */
export function CondenserTick(
  condenserState: CondenserState,
  boilerSteamFlow: number,
  deltaTime: number,
): CondenserState {
  const { newPressure, newIsSjaeEnabled } = calculatePressure(condenserState, boilerSteamFlow, deltaTime)

  return {
    ...condenserState,
    pressure: newPressure,
    isSjaeEnabled: newIsSjaeEnabled,
  }
}
