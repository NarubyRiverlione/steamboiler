import { CstSimulation } from "../const"
import {
  calculateElectricityOutput,
  calculateRPM,
  calculateValveAdjustment,
  isAtSyncSpeed,
} from "../../utils/turbineCalculations"
import { TurbineState } from "../PowerPlantState"

// PID controller state (persists between function calls)
let integralError = 0
let previousError = 0

/**
 * turbineTick - Updates the turbine state for each simulation tick.
 * Phase 4 implementation: Includes RPM calculation, automatic valve control,
 * and generator breaker functionality.
 *
 * @param turbineState - The current turbine state.
 * @param turbineValvePosition - The current position of the turbine valve.
 * @param boilerPressure - The current boiler pressure.
 * @returns The updated turbine state.
 */
function TurbineTick(
  turbineState: TurbineState,
  turbineValvePosition: number,
  boilerPressure: number,
): TurbineState {
  // Calculate new RPM based on steam flow and boiler pressure
  const newRPM = calculateRPM(turbineState.rpm, turbineState.turbineSteamFlowOut, boilerPressure)
  
  // Auto-open breaker if RPM goes outside acceptable margin with breaker closed
  const generatorBreaker = turbineState.generatorBreaker && isAtSyncSpeed(newRPM)
  
  // Calculate electricity output with updated breaker status
  const newElectricityOutput = calculateElectricityOutput(
    turbineValvePosition, 
    newRPM,
    generatorBreaker
  )

  // Handle automatic valve control in hold mode
  const newTurbineValvePosition = updateTurbineValve(turbineState, newRPM)

  return {
    ...turbineState,
    electricOutput: newElectricityOutput,
    rpm: newRPM,
    turbineValvePosition: newTurbineValvePosition,
    generatorBreaker, // Update breaker status
  }
}

function updateTurbineValve(turbineState: TurbineState, newRPM: number) {
  const { holdMode, mainSteamValve, turbineValvePosition } = turbineState
  // only adjust when in Hold mode (and there Main Steam Valve is open)
  if (!holdMode || !mainSteamValve) return turbineValvePosition

  const { valveAdjustment, newIntegralError, newPreviousError } = calculateValveAdjustment(
    newRPM,
    turbineState.rpmSetPoint,
    previousError,
    integralError,
    CstSimulation.DeltaTime,
  )

  // Update PID state
  integralError = newIntegralError
  previousError = newPreviousError

  // Adjust valve position
  const newTurbineValvePosition = Math.max(0, Math.min(1, turbineValvePosition + valveAdjustment))
  return newTurbineValvePosition
}

export default TurbineTick
