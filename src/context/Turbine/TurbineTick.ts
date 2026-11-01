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
 * @param condenserPressure - The current condenser pressure (mbar absolute), checked against the vacuum limit.
 * @returns The updated turbine state.
 */
function TurbineTick(
  turbineState: TurbineState,
  turbineValvePosition: number,
  boilerPressure: number,
  condenserPressure: number,
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

  // Above the vacuum limit an open valve trips; otherwise the hold-mode PID may move it (ADR 0003)
  const aboveVacuumLimit = condenserPressure > CstSimulation.CstCondenser.VacuumLimit
  const valveControl =
    aboveVacuumLimit && turbineState.turbineValvePosition > 0
      ? tripTurbine()
      : updateTurbineValve(turbineState, newRPM, aboveVacuumLimit)

  return {
    ...turbineState,
    ...valveControl,
    electricOutput: newElectricityOutput,
    rpm: newRPM,
    generatorBreaker, // Update breaker status
  }
}

type ValveControl = Pick<
  TurbineState,
  "turbineValvePosition" | "pidIntegralError" | "pidPreviousError" | "holdMode" | "turbineTripped"
>

// Turbine trip: valve fully closed, hold mode off and PID memory cleared, so nothing reopens it on its own
const tripTurbine = (): ValveControl => ({
  turbineValvePosition: 0,
  holdMode: false,
  pidIntegralError: 0,
  pidPreviousError: 0,
  turbineTripped: true,
})

// Hold-mode PID: the controller memory lives in the turbine state, so a tick depends on its input alone.
// Above the vacuum limit it may only close the valve; any opening clears the trip flag.
function updateTurbineValve(turbineState: TurbineState, newRPM: number, aboveVacuumLimit: boolean): ValveControl {
  const { holdMode, mainSteamValve, turbineValvePosition, pidIntegralError, pidPreviousError, turbineTripped } =
    turbineState
  // only adjust when in Hold mode (and there Main Steam Valve is open); the PID memory carries over
  if (!holdMode || !mainSteamValve)
    return { turbineValvePosition, pidIntegralError, pidPreviousError, holdMode, turbineTripped }

  const { valveAdjustment, newIntegralError, newPreviousError } = calculateValveAdjustment(
    newRPM,
    turbineState.rpmSetPoint,
    pidPreviousError,
    pidIntegralError,
    CstSimulation.DeltaTime,
  )

  const adjusted = Math.max(0, Math.min(1, turbineValvePosition + valveAdjustment))
  const newPosition = aboveVacuumLimit ? Math.min(turbineValvePosition, adjusted) : adjusted
  return {
    turbineValvePosition: newPosition,
    pidIntegralError: newIntegralError,
    pidPreviousError: newPreviousError,
    holdMode,
    turbineTripped: turbineTripped && newPosition <= turbineValvePosition,
  }
}

export default TurbineTick
