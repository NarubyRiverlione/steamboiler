/** Air and gas physics of the deaerator vessel (ADR 0038): the air as a mass in the gas space, the vents as orifices. Pure functions. */

import { CstDeaerator, CstPhysics } from "../context/const"
import { getSteamData } from "./steamTable"

const KelvinOffset = 273.15
const PaPerBar = 1e5
const SteamTableStart = 80 // °C, where the steam table starts

// Saturation pressure (bar) of the water: Antoine below the steam table, the table from 80 °C up
export function saturationPressureOf(temperature: number): number {
  if (temperature >= SteamTableStart) return getSteamData(temperature).pressure
  const mmHg: number = Math.pow(10, 8.07131 - 1730.63 / (233.426 + temperature))
  return (mmHg * 101325) / 760 / PaPerBar
}

// Gas space (m³) over the water: the total volume less the water volume (both in litres)
export const gasVolumeOf = (waterVolume: number): number => Math.max(1e-3, (CstDeaerator.TotalVolume - waterVolume) / 1000)

// Air partial pressure (bar) of an air mass (kg) in the gas space: P·V = m·R·T
export function airPressureOf(airMass: number, temperature: number, waterVolume: number): number {
  return (airMass * CstPhysics.AirGasConstant * (temperature + KelvinOffset)) / gasVolumeOf(waterVolume) / PaPerBar
}

// Air mass (kg) that makes an air partial pressure (bar) at the water temperature and volume
export function airMassInGasSpace(airPressure: number, temperature: number, waterVolume: number): number {
  return (airPressure * PaPerBar * gasVolumeOf(waterVolume)) / (CstPhysics.AirGasConstant * (temperature + KelvinOffset))
}

export type VentGas = { airShare: number; density: number } // share of the mixture mass that is air, and the mixture density (kg/m³)

// The gas space as a mixture of air and steam at the water temperature
export function ventGasOf(airPressure: number, saturationPressure: number, temperature: number): VentGas {
  const air: number = airPressure * PaPerBar * CstPhysics.AirMolarMass
  const steam: number = saturationPressure * PaPerBar * CstPhysics.WaterMolarMass
  return {
    airShare: air + steam > 0 ? air / (air + steam) : 0,
    density: (air + steam) / (CstPhysics.UniversalGasConstant * (temperature + KelvinOffset)),
  }
}

// Mixture flow (kg/s) through an orifice of effective area (m²) from a vessel at `pressure` to the atmosphere: A·√(2·ρ·ΔP)
export function orificeFlow(area: number, density: number, pressure: number): number {
  const drop: number = (pressure - CstPhysics.AtmosphericPressure_mBar / 1e3) * PaPerBar
  return drop > 0 ? area * Math.sqrt(2 * density * drop) : 0
}
