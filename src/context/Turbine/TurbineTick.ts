import { calculateElectricityOutput } from "../../utils/turbineCalculations"
import { TurbineState } from "../PowerPlantState"

/**
 * turbineTick - Updates the turbine state for each simulation tick.
 * Phase 1 implementation: Minimal placeholder logic.
 *
 * @param turbineState - The current turbine state.
 * @returns The updated turbine state.
 */
function TurbineTick(turbineState: TurbineState, turbineValvePosition: number): TurbineState {
  // console.log("3")
  //  phase 1 black-box dummy
  const newElectricityOutput = calculateElectricityOutput(turbineValvePosition)

  return { ...turbineState, electricOutput: newElectricityOutput }
}

export default TurbineTick
