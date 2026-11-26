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
} from "../../utils/turbineCalculations"
import { shaftDropWithExtraction } from "../../utils/extractionHeater"
import { OilState, SpeedMode, TurbineState } from "../PowerPlantState"
import { isBelowOilTripLimit, isTurbineRunning } from "../Oil/OilTick"

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
 * @param steamTemperature - The steam temperature (°C) after the superheater (ADR 0044); saturated steam when left out.
 * @param rollPermissive - False below the lube oil permissive pressure (ADR 0050) or on a stopped rotor off the turning gear (ADR 0051): the Ramp up / Hold PID may not open the valve.
 * @param houseLoad - The auxiliary load (MW) in house load operation (#182): the generator carries it at once and the load setpoint is ignored; undefined with the grid supply breaker closed.
 * @returns The updated turbine state.
 */
function TurbineTick(
  turbineState: TurbineState,
  boilerPressure: number,
  condenserPressure: number,
  extractionFlow = 0,
  steamTemperature = 0,
  rollPermissive = true,
  auxiliaryLoad = 0,
): TurbineState {
  const { ticked, newRPM, connected } = shaftTick(turbineState, boilerPressure, condenserPressure, extractionFlow, steamTemperature, auxiliaryLoad)

  // Above the vacuum limit (ADR 0003) or at the overspeed limit (ADR 0040) an open valve trips
  if (isTripCondition(newRPM, condenserPressure) && turbineState.turbineValvePosition > 0) return { ...ticked, ...turbineTrip }

  return { ...ticked, ...speedControlTick(turbineState, newRPM, connected, condenserPressure, rollPermissive) }
}

// True above the vacuum limit (ADR 0003) or at the overspeed limit (ADR 0040)
const isTripCondition = (rpm: number, condenserPressure: number): boolean =>
  isAboveVacuumLimit(condenserPressure) || isAtOverspeed(rpm)

type ShaftTick = { ticked: TurbineState; newRPM: number; connected: boolean }

// The shaft and the generator for one tick: the enthalpy drop (less what the extraction steam no longer does after the tap)
// gives the shaft power; the load the generator carries moves toward the setpoint (breaker closed only) and is a resisting
// torque on the shaft, never derived from the steam flow (ADR 0027). With the generator breaker open and the unit aux breaker closed (house load operation, the island) it is the auxiliary load,
// stepped at once (#182, #189). Both breakers auto-open outside the sync margin and the load drops with it.
function shaftTick(
  turbineState: TurbineState,
  boilerPressure: number,
  condenserPressure: number,
  extractionFlow: number,
  steamTemperature: number,
  auxiliaryLoad: number,
): ShaftTick {
  const enthalpyDrop: number = shaftDropWithExtraction(
    boilerPressure,
    condenserPressure / MbarPerBar,
    turbineState.turbineSteamFlowOut,
    extractionFlow,
    steamTemperature,
  )
  const load: number = turbineState.generatorBreaker
    ? loadAfter(turbineState.electricOutput, turbineState.loadSetpoint)
    : turbineState.unitAuxBreaker
      ? auxiliaryLoad
      : 0
  const newRPM: number = calculateRPM(turbineState.rpm, turbineState.turbineSteamFlowOut, enthalpyDrop, load)
  const inWindow: boolean = isAtSyncSpeed(newRPM)
  const generatorBreaker: boolean = turbineState.generatorBreaker && inWindow
  const unitAuxBreaker: boolean = turbineState.unitAuxBreaker && inWindow
  const connected: boolean = generatorBreaker || unitAuxBreaker
  const ticked: TurbineState = {
    ...turbineState,
    electricOutput: connected ? load : 0,
    loadSetpoint: generatorBreaker ? turbineState.loadSetpoint : 0,
    rpm: newRPM,
    generatorBreaker,
    unitAuxBreaker,
  }
  return { ticked, newRPM, connected }
}

// The Ramp up / Hold PID may move the valve, never past the cap; while tripped it may not open (only a trip reset clears the flag, ADR 0043).
// A breaker that auto-opened this tick ends Synchronised in Hold at sync speed, so the governor survives a load rejection (#135)
function speedControlTick(
  turbineState: TurbineState,
  newRPM: number,
  connected: boolean,
  condenserPressure: number,
  rollPermissive: boolean,
): Pick<TurbineState, "runUpPoint"> & SpeedControl {
  const { turbineValvePosition: currentPosition, turbineTripped } = turbineState
  const lostSync: boolean = turbineState.speedMode === "synchronised" && !connected
  const control: TurbineState = lostSync ? { ...turbineState, speedMode: "hold", runUpPoint: CstTurbine.SyncRPM } : turbineState
  const pid = updateTurbineValve(control, newRPM, turbineTripped || !rollPermissive ? currentPosition : maxTurbineValvePosition(currentPosition, condenserPressure))
  return { runUpPoint: control.runUpPoint, ...pid }
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

// Turbine trip on low lube oil header pressure (ADR 0050): a running turbine (rpm above the running speed or the valve open) trips, a stopped one does not
export function TurbineTripOnLowOil(turbineState: TurbineState, oil: OilState): TurbineState {
  return isBelowOilTripLimit(oil) && isTurbineRunning(turbineState) ? { ...turbineState, ...turbineTrip } : turbineState
}

// Low-pressure closure: at or below the minimum pressure at the start of the tick the main steam valve closes, before
// any steam leaves, until the operator reopens it above the limit. An open turbine valve makes it a turbine trip (ADR 0026)
export function MainSteamValveLowPressureClosure(turbineState: TurbineState, boilerPressure: number): TurbineState {
  if (!turbineState.mainSteamValve || isAboveMainSteamValveMinimum(boilerPressure)) return turbineState
  const trip = turbineState.turbineValvePosition > 0 ? turbineTrip : {}
  return { ...turbineState, mainSteamValve: false, ...trip }
}

// Ramp up: the reference climbs at the run-up rate and stops at the point; Hold aims at the point itself and
// Synchronised at sync speed
const speedReferenceAfter = (speedMode: SpeedMode, runUpPoint: number, speedReference: number): number =>
  speedMode === "synchronised"
    ? CstTurbine.SyncRPM
    : speedMode === "hold"
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
