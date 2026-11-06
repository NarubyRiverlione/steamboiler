import { CstSimulation } from "../context/const"
import { SpeedMode, TurbineState } from "../context/PowerPlantState"

const { CstCondenser, CstTurbine } = CstSimulation

// True when the turbine runs within the breaker margin of sync speed
export const isAtSyncSpeed = (rpm: number): boolean =>
  Math.abs(rpm - CstTurbine.SyncRPM) <= CstTurbine.BreakerRPMMargin

// Generator frequency in Hz, set by shaft speed alone: f = rpm x poles / 120
export const generatorFrequency = (rpm: number): number => (rpm * CstTurbine.GeneratorPoles) / 120

// Hold engages, and Ramp up hands over to it, only within the engage window of the selected run-up point
export const isWithinHoldWindow = (rpm: number, runUpPoint: number): boolean =>
  Math.abs(rpm - runUpPoint) <= CstTurbine.HoldEngageWindow

// Why a speed mode change is refused, or undefined when it is allowed (Free always is). The reducer refuses on it
// and the UI shows it on the disabled control.
export function speedModeRefusal(turbine: TurbineState, mode: SpeedMode): string | undefined {
  if (mode === "rampUp") return rampUpRefusal(turbine)
  if (mode === "hold") return holdRefusal(turbine)
  return undefined
}

function rampUpRefusal({ mainSteamValve, rpm, runUpPoint }: TurbineState): string | undefined {
  if (!mainSteamValve) return "Open the main steam valve first"
  return runUpPoint <= rpm ? "Select a run-up point above the current speed" : undefined
}

function holdRefusal({ rpm, runUpPoint }: TurbineState): string | undefined {
  return isWithinHoldWindow(rpm, runUpPoint)
    ? undefined
    : `Hold engages only within ±${String(CstTurbine.HoldEngageWindow)} rpm of the run-up point`
}

// Why selecting a run-up point is refused, or undefined when it is allowed: in Free any point selects the target,
// in Ramp up or Hold only a point above the current speed, with the main steam valve open, restarts Ramp up
export function runUpPointRefusal(turbine: TurbineState, point: number): string | undefined {
  if (!CstTurbine.RunUpPoints.includes(point)) return "Not a run-up point"
  if (turbine.speedMode === "free") return undefined
  if (!turbine.mainSteamValve) return "Open the main steam valve first"
  if (point <= turbine.rpm) return "Ramp up only goes up: switch to Free to slow down"
  return undefined
}

// True when boiler pressure (bar) is above the main steam valve minimum: only then may the valve open or stay open (ADR 0026)
export const isAboveMainSteamValveMinimum = (boilerPressure: number): boolean =>
  boilerPressure > CstTurbine.MainSteamValveMinimumPressure

// True when condenser pressure (mbar absolute) is above the vacuum limit; a deep vacuum is never refused (ADR 0003)
export const isAboveVacuumLimit = (condenserPressure: number): boolean => condenserPressure > CstCondenser.VacuumLimit

// Highest turbine valve position allowed: above the vacuum limit the valve may close but not open further
export const maxTurbineValvePosition = (currentPosition: number, condenserPressure: number): number =>
  isAboveVacuumLimit(condenserPressure) ? currentPosition : 1

// The turbine trip flag clears on the next opening of the turbine valve, by the operator or the hold-mode PID
export const turbineTrippedAfter = (tripped: boolean, previousPosition: number, newPosition: number): boolean =>
  tripped && newPosition <= previousPosition

/**
 * Electric output of the generator, from the steam flow and the isentropic enthalpy drop:
 * MW = flow [kg/s] x drop [kJ/kg] x turbine isentropic efficiency x generator efficiency / 1000.
 * Produced only with the breaker closed at sync speed; clamped at 0 MW for no flow or a non-positive drop.
 *
 * @param steamFlow - Steam flow through the turbine in kg/s
 * @param enthalpyDrop - Isentropic enthalpy drop from boiler to condenser pressure in kJ/kg
 * @param rpm - The current RPM of the turbine
 * @param generatorBreaker - Whether the generator breaker is closed
 * @returns The electric output in MW
 */
export function calculateElectricityOutput(
  steamFlow: number,
  enthalpyDrop: number,
  rpm: number,
  generatorBreaker: boolean,
): number {
  if (!generatorBreaker || !isAtSyncSpeed(rpm)) return 0
  const megawatt: number =
    (steamFlow * enthalpyDrop * CstTurbine.IsentropicEfficiency * CstTurbine.GeneratorEfficiency) / 1000
  return Math.max(0, megawatt)
}

const RadPerSecPerRpm = (2 * Math.PI) / 60
const JPerKJ = 1000 // kJ to J, so kg/s x kJ/kg gives W

const syncSpeed: number = CstTurbine.SyncRPM * RadPerSecPerRpm // ω_s, rad/s

// Rated electric output S in W: the same chain as calculateElectricityOutput at the rated flow and drop
const ratedOutput: number =
  CstTurbine.RatedSteamFlow *
  CstTurbine.RatedEnthalpyDrop *
  JPerKJ *
  CstTurbine.IsentropicEfficiency *
  CstTurbine.GeneratorEfficiency

// Shaft inertia in kg·m²: J = 2·H·S / ω_s²
const inertia: number = (2 * CstTurbine.InertiaConstant * ratedOutput) / syncSpeed ** 2

// Loss torque coefficient in N·m·s²: loss power k·ω³ equals the no-load shaft power at sync speed
const noLoadPower: number =
  CstTurbine.NoLoadFlowFraction *
  CstTurbine.RatedSteamFlow *
  CstTurbine.RatedEnthalpyDrop *
  JPerKJ *
  CstTurbine.IsentropicEfficiency
const lossCoefficient: number = noLoadPower / syncSpeed ** 3

/**
 * Calculates the RPM of the turbine after one tick from the shaft power the steam delivers.
 * Shaft power P = flow x enthalpy drop x isentropic efficiency (W). Torque follows T = (P / ω_s)(2 − ω / ω_s):
 * twice the sync-speed torque at standstill and no division by zero. Losses take torque k·ω² (power ∝ ω³),
 * calibrated so the no-load flow holds sync speed. J·dω/dt = T − k·ω², with J derived from H (ADR 0021).
 *
 * @param currentRPM - The current RPM of the turbine
 * @param steamFlow - The steam flow through the turbine in kg/s
 * @param enthalpyDrop - Isentropic enthalpy drop from boiler to condenser pressure in kJ/kg
 * @returns The new RPM value
 */
export function calculateRPM(currentRPM: number, steamFlow: number, enthalpyDrop: number): number {
  const omega: number = currentRPM * RadPerSecPerRpm
  const shaftPower: number = Math.max(0, steamFlow * enthalpyDrop * JPerKJ * CstTurbine.IsentropicEfficiency)
  const steamTorque: number = (shaftPower / syncSpeed) * (2 - omega / syncSpeed)
  const lossTorque: number = lossCoefficient * omega ** 2
  const angularAcceleration: number = (steamTorque - lossTorque) / inertia
  const newOmega: number = Math.max(0, omega + angularAcceleration * CstSimulation.DeltaTime)
  return newOmega / RadPerSecPerRpm
}

/**
 * Calculates the valve adjustment needed to maintain the RPM setpoint in hold mode.
 * Uses a PID controller whose derivative acts on the measured rpm (not the error), so engaging
 * the controller or changing the setpoint gives no derivative kick and D needs no controller memory.
 * 
 * @param currentRPM - The RPM after this tick
 * @param previousRPM - The RPM before this tick
 * @param setPointRPM - The target RPM
 * @param integralError - The accumulated error over time
 * @param deltaTime - The simulation time step in seconds
 * @returns Object containing the valve adjustment and the updated integral error
 */
export function calculateValveAdjustment(
  currentRPM: number,
  previousRPM: number,
  setPointRPM: number,
  integralError: number,
  deltaTime: number
): {
  valveAdjustment: number,
  newIntegralError: number
} {
  const error = setPointRPM - currentRPM
  
  // Proportional term
  const P = CstTurbine.PID_Kp * error
  
  // Integral term (with anti-windup)
  const newIntegralError = Math.max(-1, Math.min(1, integralError + error * deltaTime))
  const I = CstTurbine.PID_Ki * newIntegralError
  
  // Derivative term on measurement: damps a rising rpm
  const D = -CstTurbine.PID_Kd * (currentRPM - previousRPM) / deltaTime
  
  return {
    valveAdjustment: P + I + D,
    newIntegralError
  }
}
