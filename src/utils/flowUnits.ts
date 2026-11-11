/**
 * Display conversions from the l/s design values of the pumps, valves and gas to kg/s, the unit the simulation conserves (#123).
 */

import { CstFlueGas } from "../context/const"
import { waterMassOf } from "./boilerCalculations"

// Water flow (kg/s) of a volume flow (l/s) at the temperature of the water at that point
export function waterKgPerSecond(litresPerSecond: number, temperature: number): number {
  return waterMassOf(litresPerSecond, temperature)
}

// Gas flow (kg/s) of a volume flow (l/s), at the mass per gas volume the flue gas model uses
export function gasKgPerSecond(litresPerSecond: number): number {
  return (litresPerSecond / 1000) * CstFlueGas.MassPerGasVolume
}
