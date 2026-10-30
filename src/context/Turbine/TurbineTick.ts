import { CstSimulation } from "../const"
import {
  calculateElectricityOutput,
  calculateRPM,
  calculateValveAdjustment,
  isAtSyncSpeed,
} from "../../utils/turbineCalculations"
import { TurbineState } from "../PowerPlantState"

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
  const valveControl = updateTurbineValve(turbineState, newRPM)

  return {
    ...turbineState,
    ...valveControl,
    electricOutput: newElectricityOutput,
    rpm: newRPM,
    generatorBreaker, // Update breaker status
  }
}

type ValveControl = Pick<TurbineState, "turbineValvePosition" | "pidIntegralError" | "pidPreviousError">

// Hold-mode PID: the controller memory lives in the turbine state, so a tick depends on its input alone
function updateTurbineValve(turbineState: TurbineState, newRPM: number): ValveControl {
  const { holdMode, mainSteamValve, turbineValvePosition, pidIntegralError, pidPreviousError } = turbineState
  // only adjust when in Hold mode (and there Main Steam Valve is open); the PID memory carries over
  if (!holdMode || !mainSteamValve) return { turbineValvePosition, pidIntegralError, pidPreviousError }

  const { valveAdjustment, newIntegralError, newPreviousError } = calculateValveAdjustment(
    newRPM,
    turbineState.rpmSetPoint,
    pidPreviousError,
    pidIntegralError,
    CstSimulation.DeltaTime,
  )

  return {
    turbineValvePosition: Math.max(0, Math.min(1, turbineValvePosition + valveAdjustment)),
    pidIntegralError: newIntegralError,
    pidPreviousError: newPreviousError,
  }
}

export default TurbineTick
