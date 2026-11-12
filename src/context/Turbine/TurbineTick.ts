import { CstSimulation } from "../const"
import {
  calculateRPM,
  calculateValveAdjustment,
  isAboveMainSteamValveMinimum,
  isAboveVacuumLimit,
  isAtOverspeed,
  isAtSyncSpeed,
  isWithinHoldWindow,
  loadAfter,
  maxTurbineValvePosition,
  turbineTrippedAfter,
} from "../../utils/turbineCalculations"
import { shaftDropWithExtraction } from "../../utils/extractionHeater"
import { SpeedMode, TurbineState } from "../PowerPlantState"

const { CstTurbine } = CstSimulation

const MbarPerBar = 1000
const SecondsPerMinute = 60

/**
 * turbineTick - Updates the turbine state for each simulation tick.
 * Includes RPM calculation with the generator load, automatic valve control and the generator breaker.
 *
 * @param turbineState - The current turbine state.
 * @param boilerPressure - The current boiler pressure.
 * @param condenserPressure - The current condenser pressure (mbar absolute), checked against the vacuum limit.
 * @param extractionFlow - The steam (kg/s) the heater took at the tap in the last tick, which no longer does work after the tap (ADR 0031).
 * @returns The updated turbine state.
 */
function TurbineTick(
  turbineState: TurbineState,
  boilerPressure: number,
  condenserPressure: number,
  extractionFlow = 0,
): TurbineState {
  // The enthalpy drop (less what the extraction steam no longer does after the tap) gives the shaft power; the load the generator carries moves toward the setpoint (breaker closed
  // only) and is a resisting torque on the shaft, never derived from the steam flow (ADR 0027)
  const enthalpyDrop: number = shaftDropWithExtraction(
    boilerPressure,
    condenserPressure / MbarPerBar,
    turbineState.turbineSteamFlowOut,
    extractionFlow,
  )
  const load: number = turbineState.generatorBreaker ? loadAfter(turbineState.electricOutput, turbineState.loadSetpoint) : 0
  const newRPM: number = calculateRPM(turbineState.rpm, turbineState.turbineSteamFlowOut, enthalpyDrop, load)

  // Auto-open breaker if RPM goes outside acceptable margin with breaker closed; the load drops with it
  const generatorBreaker: boolean = turbineState.generatorBreaker && isAtSyncSpeed(newRPM)

  const ticked: TurbineState = {
    ...turbineState,
    electricOutput: generatorBreaker ? load : 0,
    loadSetpoint: generatorBreaker ? turbineState.loadSetpoint : 0,
    rpm: newRPM,
    generatorBreaker, // Update breaker status
  }

  // Above the vacuum limit (ADR 0003) or at the overspeed limit (ADR 0040) an open valve trips
  const { turbineValvePosition: currentPosition, turbineTripped } = turbineState
  if ((isAboveVacuumLimit(condenserPressure) || isAtOverspeed(newRPM)) && currentPosition > 0) return { ...ticked, ...turbineTrip }

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

// Turbine trip from outside the turbine (boiler high-high level, ADR 0041): an open valve trips, a shut one is left alone
export function TurbineTripWhenOpen(turbineState: TurbineState): TurbineState {
  return turbineState.turbineValvePosition > 0 ? { ...turbineState, ...turbineTrip } : turbineState
}

// Low-pressure closure: at or below the minimum pressure at the start of the tick the main steam valve closes, before
// any steam leaves, until the operator reopens it above the limit. An open turbine valve makes it a turbine trip (ADR 0026)
export function MainSteamValveLowPressureClosure(turbineState: TurbineState, boilerPressure: number): TurbineState {
  if (!turbineState.mainSteamValve || isAboveMainSteamValveMinimum(boilerPressure)) return turbineState
  const trip = turbineState.turbineValvePosition > 0 ? turbineTrip : {}
  return { ...turbineState, mainSteamValve: false, ...trip }
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
