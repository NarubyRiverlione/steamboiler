/**
 * Display conversions from the l/s design values of the pumps and valves to kg/s, the unit the simulation conserves (#123).
 */

import { waterMassOf } from "./boilerCalculations"

// Water flow (kg/s) of a volume flow (l/s) at the temperature of the water at that point
export function waterKgPerSecond(litresPerSecond: number, temperature: number): number {
  return waterMassOf(litresPerSecond, temperature)
}
