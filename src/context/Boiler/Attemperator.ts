/**
 * Spray attemperator (ADR 0044): a valve that injects feedwater into the steam between the superheater stages to hold the
 * steam temperature at its setpoint. In Auto a PID moves the valve, with its derivative on the measurement (ADR 0010); in
 * Manual the operator sets it. Pure functions, the state lives in BoilerState.
 */
import { CstSuperheater } from "../const"
import { BoilerState } from "../PowerPlantState"
import { getLiquidEnthalpy, getSaturationEnthalpies, getSteamTemperature } from "../../utils/steamTable"

const { SteamTemperature, PID_Kp, PID_Ki, PID_Kd, IntegralLimit } = CstSuperheater

// Spray flow (kg/s) at a valve position (0-1)
export const sprayFlowOf = (position: number): number => Math.max(0, Math.min(1, position)) * CstSuperheater.SprayCapacity

type Attemperator = Pick<BoilerState, "sprayValvePosition" | "attemperatorIntegralError">

// The PID after one tick: position = Kp·error + Ki·integral + Kd·rate of the measurement, clamped to 0-1. The error is
// the steam above the setpoint (the spray only cools), the integral stays between 0 and IntegralLimit (anti-windup).
// Manual leaves the valve where the operator put it and holds the integral at the position it would need.
export function attemperatorAfter(
  { sprayValvePosition, attemperatorIntegralError }: Attemperator,
  auto: boolean,
  steamTemperature: number,
  previousSteamTemperature: number,
  deltaTime: number,
): Attemperator {
  if (!auto) return { sprayValvePosition, attemperatorIntegralError: integralFor(sprayValvePosition) }
  const error: number = steamTemperature - SteamTemperature
  const integral: number = Math.max(0, Math.min(IntegralLimit, attemperatorIntegralError + error * deltaTime))
  const rate: number = (steamTemperature - previousSteamTemperature) / deltaTime
  const position: number = Math.max(0, Math.min(1, PID_Kp * error + PID_Ki * integral + PID_Kd * rate))
  return { sprayValvePosition: position, attemperatorIntegralError: integral }
}

// The integral that gives this position with no error: the bumpless switch from Manual to Auto
export const integralFor = (position: number): number => Math.max(0, Math.min(IntegralLimit, position / PID_Ki))

/**
 * The steam temperature (°C) the plant settles at for this tick: the steam of `steamFlow` (kg/s) takes `heat` (kW) from the
 * flue gas, then the spray (kg/s of feedwater at `sprayEnthalpy`) mixes in. No steam flow leaves saturation as it was.
 */
export function equilibriumSteamTemperature(
  pressure: number,
  steamFlow: number,
  heat: number,
  sprayFlow: number,
  sprayEnthalpy: number,
  saturationTemperature: number,
): number {
  if (steamFlow <= 0) return saturationTemperature
  const saturated: number = getSaturationEnthalpies(pressure).vapor
  const mixed: number = (steamFlow * saturated + heat + sprayFlow * sprayEnthalpy) / (steamFlow + sprayFlow)
  return Math.max(saturationTemperature, getSteamTemperature(pressure, mixed))
}

// Enthalpy (kJ/kg) of the spray water: the feed pump discharge at the deaerator temperature
export const sprayEnthalpyOf = (feedTemperature: number): number => getLiquidEnthalpy(feedTemperature)

