import { CstSimulation } from "../const"
import { calculateElectricityOutput, calculateRPM, calculateValveAdjustment } from "../../utils/turbineCalculations"
import { TurbineState } from "../PowerPlantState"

// PID controller state (persists between function calls)
let integralError = 0
let previousError = 0

/**
 * turbineTick - Updates the turbine state for each simulation tick.
 * Phase 3 implementation: Includes RPM calculation and automatic valve control.
 *
 * @param turbineState - The current turbine state.
 * @param turbineValvePosition - The current position of the turbine valve.
 * @param boilerPressure - The current boiler pressure.
 * @returns The updated turbine state.
 */
function TurbineTick(
  turbineState: TurbineState, 
  turbineValvePosition: number,
  boilerPressure: number
): TurbineState {
  // Calculate electricity output
  const newElectricityOutput = calculateElectricityOutput(turbineValvePosition)
  
  // Calculate new RPM based on steam flow and boiler pressure
  const newRPM = calculateRPM(
    turbineState.rpm,
    turbineState.turbineSteamFlowOut,
    boilerPressure,
    CstSimulation.DeltaTime
  )
  
  // Handle automatic valve control in hold mode
  let newTurbineValvePosition = turbineValvePosition
  
  if (turbineState.holdMode && turbineState.mainSteamValve) {
    const { 
      valveAdjustment, 
      newIntegralError, 
      newPreviousError 
    } = calculateValveAdjustment(
      newRPM,
      turbineState.rpmSetPoint,
      previousError,
      integralError,
      CstSimulation.DeltaTime
    )
    
    // Update PID state
    integralError = newIntegralError
    previousError = newPreviousError
    
    // Adjust valve position
    newTurbineValvePosition = Math.max(0, Math.min(1, turbineValvePosition + valveAdjustment))
  }
  
  return { 
    ...turbineState, 
    electricOutput: newElectricityOutput,
    rpm: newRPM,
    turbineValvePosition: newTurbineValvePosition
  }
}

export default TurbineTick
