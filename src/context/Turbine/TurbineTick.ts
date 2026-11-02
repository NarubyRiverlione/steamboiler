import { CstSimulation } from "../const"
import {
  calculateElectricityOutput,
  calculateRPM,
  calculateValveAdjustment,
  isAboveVacuumLimit,
  isAtSyncSpeed,
  maxTurbineValvePosition,
  turbineTrippedAfter,
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

  const ticked: TurbineState = {
    ...turbineState,
    electricOutput: newElectricityOutput,
    rpm: newRPM,
    generatorBreaker, // Update breaker status
  }

  // Above the vacuum limit an open valve trips (ADR 0003)
  const { turbineValvePosition: currentPosition, turbineTripped } = turbineState
  if (isAboveVacuumLimit(condenserPressure) && currentPosition > 0) return { ...ticked, ...turbineTrip }

  // Otherwise the hold-mode PID may move the valve, never past the cap; an opening clears the trip flag
  const pid = updateTurbineValve(turbineState, newRPM, maxTurbineValvePosition(currentPosition, condenserPressure))
  return {
    ...ticked,
    ...pid,
    turbineTripped: turbineTrippedAfter(turbineTripped, currentPosition, pid.turbineValvePosition),
  }
}

type PidControl = Pick<TurbineState, "turbineValvePosition" | "pidIntegralError">

// Turbine trip: valve fully closed, hold mode off and the integral cleared, so nothing reopens it on its own
const turbineTrip: Pick<TurbineState, keyof PidControl | "holdMode" | "turbineTripped"> = {
  turbineValvePosition: 0,
  holdMode: false,
  pidIntegralError: 0,
  turbineTripped: true,
}

// Hold-mode PID: the integral lives in the turbine state, the derivative uses the rpm before this tick.
// It never moves the valve above maxPosition (the current position above the vacuum limit).
function updateTurbineValve(turbineState: TurbineState, newRPM: number, maxPosition: number): PidControl {
  const { holdMode, mainSteamValve, turbineValvePosition, pidIntegralError, rpm } = turbineState
  // inactive (hold mode off or Main Steam Valve closed): the integral resets, so every (re)engage starts fresh
  if (!holdMode || !mainSteamValve) return { turbineValvePosition, pidIntegralError: 0 }

  const { valveAdjustment, newIntegralError } = calculateValveAdjustment(
    newRPM,
    rpm,
    turbineState.rpmSetPoint,
    pidIntegralError,
    CstSimulation.DeltaTime,
  )

  return {
    turbineValvePosition: Math.max(0, Math.min(maxPosition, turbineValvePosition + valveAdjustment)),
    pidIntegralError: newIntegralError,
  }
}

export default TurbineTick
