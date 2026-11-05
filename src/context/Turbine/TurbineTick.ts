import { CstSimulation } from "../const"
import {
  calculateElectricityOutput,
  calculateRPM,
  calculateValveAdjustment,
  isAboveVacuumLimit,
  isAtSyncSpeed,
  isWithinHoldWindow,
  maxTurbineValvePosition,
  turbineTrippedAfter,
} from "../../utils/turbineCalculations"
import { getIsentropicEnthalpyDrop } from "../../utils/steamTable"
import { SpeedMode, TurbineState } from "../PowerPlantState"

const { CstTurbine } = CstSimulation

const MbarPerBar = 1000
const SecondsPerMinute = 60

/**
 * turbineTick - Updates the turbine state for each simulation tick.
 * Phase 4 implementation: Includes RPM calculation, automatic valve control,
 * and generator breaker functionality.
 *
 * @param turbineState - The current turbine state.
 * @param boilerPressure - The current boiler pressure.
 * @param condenserPressure - The current condenser pressure (mbar absolute), checked against the vacuum limit.
 * @returns The updated turbine state.
 */
function TurbineTick(
  turbineState: TurbineState,
  boilerPressure: number,
  condenserPressure: number,
): TurbineState {
  // One enthalpy drop feeds both the shaft power (speed) and the electric output
  const enthalpyDrop: number = getIsentropicEnthalpyDrop(boilerPressure, condenserPressure / MbarPerBar)
  const newRPM: number = calculateRPM(turbineState.rpm, turbineState.turbineSteamFlowOut, enthalpyDrop)
  
  // Auto-open breaker if RPM goes outside acceptable margin with breaker closed
  const generatorBreaker = turbineState.generatorBreaker && isAtSyncSpeed(newRPM)
  
  // Calculate electricity output with updated breaker status
  const newElectricityOutput: number = calculateElectricityOutput(
    turbineState.turbineSteamFlowOut,
    enthalpyDrop,
    newRPM,
    generatorBreaker,
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

  // Otherwise the Ramp up / Hold PID may move the valve, never past the cap; an opening clears the trip flag
  const pid = updateTurbineValve(turbineState, newRPM, maxTurbineValvePosition(currentPosition, condenserPressure))
  return {
    ...ticked,
    ...pid,
    turbineTripped: turbineTrippedAfter(turbineTripped, currentPosition, pid.turbineValvePosition),
  }
}

type SpeedControl = Pick<TurbineState, "turbineValvePosition" | "pidIntegralError" | "speedMode" | "speedReference">

// Turbine trip: valve fully closed, back to Free and the integral cleared, so nothing reopens it on its own
const turbineTrip: Pick<TurbineState, keyof SpeedControl | "turbineTripped"> = {
  turbineValvePosition: 0,
  speedMode: "free",
  pidIntegralError: 0,
  speedReference: 0,
  turbineTripped: true,
}

// Ramp up: the reference climbs at the run-up rate and stops at the point; Hold aims at the point itself
const speedReferenceAfter = (speedMode: SpeedMode, runUpPoint: number, speedReference: number): number =>
  speedMode === "hold"
    ? runUpPoint
    : Math.min(runUpPoint, speedReference + (CstTurbine.RunUpRate * CstSimulation.DeltaTime) / SecondsPerMinute)

// Ramp up and Hold PID: the integral lives in the turbine state, the derivative uses the rpm before this tick.
// It never moves the valve above maxPosition (the current position above the vacuum limit).
function updateTurbineValve(turbineState: TurbineState, newRPM: number, maxPosition: number): SpeedControl {
  const { speedMode, mainSteamValve, turbineValvePosition, pidIntegralError, rpm, runUpPoint, speedReference } = turbineState
  // inactive (Free or Main Steam Valve closed): the integral resets and the reference follows the speed, so every
  // (re)engage starts fresh from the current speed; the mode itself stays
  if (speedMode === "free" || !mainSteamValve) {
    return { turbineValvePosition, pidIntegralError: 0, speedMode, speedReference: newRPM }
  }

  const reference: number = speedReferenceAfter(speedMode, runUpPoint, speedReference)

  const { valveAdjustment, newIntegralError } = calculateValveAdjustment(
    newRPM,
    rpm,
    reference,
    pidIntegralError,
    CstSimulation.DeltaTime,
  )

  // Arrival: the reference is at the point and the turbine is within the window of it
  const arrived: boolean = speedMode === "rampUp" && reference >= runUpPoint && isWithinHoldWindow(newRPM, runUpPoint)

  return {
    turbineValvePosition: Math.max(0, Math.min(maxPosition, turbineValvePosition + valveAdjustment)),
    pidIntegralError: newIntegralError,
    speedMode: arrived ? "hold" : speedMode,
    speedReference: reference,
  }
}

export default TurbineTick
