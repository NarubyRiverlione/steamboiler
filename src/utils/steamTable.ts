import { type SteamData, steamTable } from "./steamData"
import { type SaturationEntropyRow, saturationEntropyTable } from "./steamEntropyData"

// Last table row: the critical point, where lookups clamp (never throw, the simulation runs this every tick)
const CriticalPoint: SteamData = steamTable[steamTable.length - 1]

// Water cannot be heated past this in the saturated model: above it there is no liquid/steam equilibrium
export const CriticalTemperature: number = CriticalPoint.temperature

type Bracket = { lower: SteamData; upper: SteamData; ratio: number }

// Find the two table rows around a value of the (ascending) key column and the interpolation ratio between them.
// The flash solver reaches this inside its bisection, so it is a binary search and not a scan of the table.
function bracket(key: "temperature" | "pressure", value: number): Bracket {
  const rows: SteamData[] = steamTable
  let low = 0
  let high: number = rows.length - 1
  while (high - low > 1) {
    const mid: number = (low + high) >> 1
    if (rows[mid][key] <= value) low = mid
    else high = mid
  }
  const lower: SteamData = rows[low]
  const upper: SteamData = rows[high]
  return { lower, upper, ratio: (value - lower[key]) / (upper[key] - lower[key]) }
}

// Helper function to get steam data through interpolation
export function getSteamData(temperature: number): SteamData {
  // Clamp temperature to the table: 80°C up to the critical point
  const clampedTemp = Math.max(steamTable[0].temperature, Math.min(CriticalPoint.temperature, temperature))
  const { lower, upper, ratio } = bracket("temperature", clampedTemp)

  return {
    temperature: clampedTemp,
    pressure: lower.pressure + ratio * (upper.pressure - lower.pressure),
    specificVolume: lower.specificVolume + ratio * (upper.specificVolume - lower.specificVolume),
    enthalpy: lower.enthalpy + ratio * (upper.enthalpy - lower.enthalpy),
    specificHeat: lower.specificHeat + ratio * (upper.specificHeat - lower.specificHeat),
    latentHeat: lower.latentHeat + ratio * (upper.latentHeat - lower.latentHeat),
  }
}

// IAPWS-IF97 saturated-liquid specific volume below the steam table, litres per kg: [°C, L/kg]
const ColdLiquidVolumes: [number, number][] = [
  [20, 1.0018],
  [25, 1.003],
  [30, 1.0044],
  [35, 1.006],
  [40, 1.0079],
  [45, 1.0099],
  [50, 1.0121],
  [55, 1.0146],
  [60, 1.0171],
  [65, 1.0199],
  [70, 1.0228],
  [75, 1.0259],
]

// One curve of litres per kg: the cold table, then every steam-table row up to the critical point, where lookups clamp
const LiquidVolumeCurve: [number, number][] = [
  ...ColdLiquidVolumes,
  ...steamTable.map((row): [number, number] => [row.temperature, row.specificVolume * 1000]),
]

// Volume (L) of 1 kg of liquid water at its own temperature: IF97 saturated liquid from 20 °C up, one curve with no
// step at 80 °C where the cold table meets the steam table. Colder than 20 °C holds the 20 °C value.
// The flash solver calls this inside its bisection, so it is a binary search and not a getSteamData lookup.
export function getWaterSpecificVolume(temperature: number): number {
  const last: number = LiquidVolumeCurve.length - 1
  if (temperature <= LiquidVolumeCurve[0][0]) return LiquidVolumeCurve[0][1]
  if (temperature >= LiquidVolumeCurve[last][0]) return LiquidVolumeCurve[last][1]
  let low = 0
  let high = last
  while (high - low > 1) {
    const mid: number = (low + high) >> 1
    if (LiquidVolumeCurve[mid][0] <= temperature) low = mid
    else high = mid
  }
  const [lowerT, lowerV] = LiquidVolumeCurve[low]
  const [upperT, upperV] = LiquidVolumeCurve[high]
  return lowerV + ((temperature - lowerT) / (upperT - lowerT)) * (upperV - lowerV)
}

// IAPWS-IF97 saturated-liquid enthalpy below the steam table, kJ per kg: [°C, kJ/kg]
const ColdLiquidEnthalpies: [number, number][] = [
  [0, 0],
  [5, 21.02],
  [10, 42.02],
  [15, 62.98],
  [20, 83.91],
  [25, 104.83],
  [30, 125.73],
  [35, 146.63],
  [40, 167.53],
  [45, 188.43],
  [50, 209.34],
  [55, 230.26],
  [60, 251.18],
  [65, 272.12],
  [70, 293.07],
  [75, 314.03],
]

// One curve of kJ per kg: the cold table, then every steam-table row up to the critical point
const LiquidEnthalpyCurve: [number, number][] = [
  ...ColdLiquidEnthalpies,
  ...steamTable.map((row): [number, number] => [row.temperature, row.enthalpy]),
]

// Interpolate along the curve on one axis (0 temperature, 1 enthalpy) and read the other; both rise together
function readLiquidEnthalpyCurve(from: 0 | 1, value: number): number {
  const to: 0 | 1 = from === 0 ? 1 : 0
  const last: number = LiquidEnthalpyCurve.length - 1
  if (value <= LiquidEnthalpyCurve[0][from]) return LiquidEnthalpyCurve[0][to]
  if (value >= LiquidEnthalpyCurve[last][from]) return LiquidEnthalpyCurve[last][to]
  let low = 0
  let high = last
  while (high - low > 1) {
    const mid: number = (low + high) >> 1
    if (LiquidEnthalpyCurve[mid][from] <= value) low = mid
    else high = mid
  }
  const lower: [number, number] = LiquidEnthalpyCurve[low]
  const upper: [number, number] = LiquidEnthalpyCurve[high]
  return lower[to] + ((value - lower[from]) / (upper[from] - lower[from])) * (upper[to] - lower[to])
}

// Enthalpy (kJ/kg) of saturated liquid water: IF97 from 0 °C up, one curve with no step at 80 °C where the cold table
// meets the steam table (getSteamData clamps at 80 °C). Colder than 0 °C holds 0, past the critical point holds its value.
export function getLiquidEnthalpy(temperature: number): number {
  return readLiquidEnthalpyCurve(0, temperature)
}

// Temperature (°C) of saturated liquid water of this enthalpy (kJ/kg), the inverse of getLiquidEnthalpy
export function getLiquidTemperature(enthalpy: number): number {
  return readLiquidEnthalpyCurve(1, enthalpy)
}

// Get water specific heat based on temperature (kJ/kg°C)
export function getWaterSpecificHeat(temperature: number): number {
  const steamData = getSteamData(temperature)
  return steamData.specificHeat
}

// Get latent heat of vaporization based on temperature (kJ/kg)
export function getLatentHeat(temperature: number): number {
  // For temperatures below our table range, use the Antoine equation to estimate
  // the saturation temperature, then extrapolate the latent heat
  if (temperature < 80) {
    // Simple extrapolation for temperatures below 80°C
    // Latent heat decreases as temperature increases
    // At 0°C it's about 2500 kJ/kg, at 80°C it's 2308 kJ/kg
    return 2500 - (2500 - 2308) * (temperature / 80)
  }

  const steamData = getSteamData(temperature)
  return steamData.latentHeat
}

// Saturation pressure below the table range (bar), the Antoine equation as in antoineBoilingPoint
function antoineSaturationPressure(temperature: number): number {
  return Math.pow(10, 8.07131 - 1730.63 / (233.426 + temperature)) / 750.062
}

const SlopeHalfWidth = 5 // K, centred difference for dP/dT, the table is piecewise linear in P
const WaterMolarMass = 0.018015 // kg/mol
const GasConstant = 8.314 // J/mol·K

// Saturated steam density (kg/m³), also the vapour density over water in a vented drum.
// In the table range: Clausius-Clapeyron, vg = vf + hfg / (T * dP/dT), since the table only holds the liquid side.
// Below it: ideal gas at the Antoine saturation pressure (accurate within 1% there).
export function getSaturatedSteamDensity(temperature: number): number {
  if (temperature < steamTable[0].temperature) {
    return (
      (antoineSaturationPressure(temperature) * 1e5 * WaterMolarMass) / (GasConstant * (temperature + 273.15))
    )
  }
  const clamped = Math.min(CriticalPoint.temperature, temperature)
  const slopeBarPerK =
    (getSteamData(clamped + SlopeHalfWidth).pressure - getSteamData(clamped - SlopeHalfWidth).pressure) /
    (2 * SlopeHalfWidth)
  const data = getSteamData(clamped)
  const evaporationVolume = data.latentHeat / ((clamped + 273.15) * slopeBarPerK * 100) // kJ/kg / (K · kPa/K)
  return 1 / (data.specificVolume + evaporationVolume)
}

// Boiling point below the table range (°C), Antoine equation: log10(P) = A - B/(C + T)
// P in mmHg, T in °C; constants for water valid for 1-200 mmHg (about 0.0013-0.267 bar)
function antoineBoilingPoint(pressure: number): number {
  const pressureInMmHg = pressure * 750.062
  if (pressureInMmHg < 1) {
    return 0 // Minimum temperature
  }
  const A = 8.07131
  const B = 1730.63
  const C = 233.426
  return Math.max(0, B / (A - Math.log10(pressureInMmHg)) - C)
}

// Get boiling point of water based on pressure (°C)
export function getBoilingPoint(pressure: number): number {
  if (pressure < steamTable[0].pressure) {
    return antoineBoilingPoint(pressure)
  }

  // Above the critical pressure there is no boiling point: clamp to the critical point
  if (pressure >= CriticalPoint.pressure) {
    return CriticalPoint.temperature
  }

  const { lower, upper, ratio } = bracket("pressure", pressure)
  return lower.temperature + ratio * (upper.temperature - lower.temperature)
}

// Saturation row at a pressure (bar): linear in ln(pressure) between the rows, clamped to the table (never throws)
function getSaturationEntropyRow(pressure: number): SaturationEntropyRow {
  const last: number = saturationEntropyTable.length - 1
  const clamped: number = Math.max(
    saturationEntropyTable[0].pressure,
    Math.min(saturationEntropyTable[last].pressure, pressure),
  )
  const index: number = Math.max(0, saturationEntropyTable.findIndex((row) => row.pressure > clamped) - 1)
  const lower: SaturationEntropyRow = saturationEntropyTable[Math.min(index, last - 1)]
  const upper: SaturationEntropyRow = saturationEntropyTable[Math.min(index, last - 1) + 1]
  const ratio: number = Math.log(clamped / lower.pressure) / Math.log(upper.pressure / lower.pressure)
  const mix = (a: number, b: number): number => a + ratio * (b - a)
  return {
    pressure: clamped,
    liquidEnthalpy: mix(lower.liquidEnthalpy, upper.liquidEnthalpy),
    vaporEnthalpy: mix(lower.vaporEnthalpy, upper.vaporEnthalpy),
    liquidEntropy: mix(lower.liquidEntropy, upper.liquidEntropy),
    vaporEntropy: mix(lower.vaporEntropy, upper.vaporEntropy),
  }
}

// Isentropic enthalpy drop (kJ/kg) of saturated steam expanding from the boiler pressure to the exhaust pressure (bar).
// The inlet is saturated vapour; the exhaust is wet steam with quality x = (s - sf) / (sg - sf) at the same entropy.
export function getIsentropicEnthalpyDrop(boilerPressure: number, exhaustPressure: number): number {
  const inlet: SaturationEntropyRow = getSaturationEntropyRow(boilerPressure)
  const exhaust: SaturationEntropyRow = getSaturationEntropyRow(exhaustPressure)
  const quality: number = (inlet.vaporEntropy - exhaust.liquidEntropy) / (exhaust.vaporEntropy - exhaust.liquidEntropy)
  const exhaustEnthalpy: number = exhaust.liquidEnthalpy + quality * (exhaust.vaporEnthalpy - exhaust.liquidEnthalpy)
  return inlet.vaporEnthalpy - exhaustEnthalpy
}

// Exhaust quality: the share of the turbine exhaust that is still vapour, by mass (0-1). The real expansion takes only
// isentropicEfficiency of the drop, so the exhaust enthalpy is the inlet enthalpy minus that part. It takes the same
// pressures as the drop; with a zero or negative drop nothing expands and the steam stays vapour.
export function getExhaustQuality(
  boilerPressure: number,
  exhaustPressure: number,
  isentropicEfficiency: number,
): number {
  const enthalpyDrop: number = getIsentropicEnthalpyDrop(boilerPressure, exhaustPressure)
  if (enthalpyDrop <= 0) return 1

  const inlet: SaturationEntropyRow = getSaturationEntropyRow(boilerPressure)
  const exhaust: SaturationEntropyRow = getSaturationEntropyRow(exhaustPressure)
  const exhaustEnthalpy: number = inlet.vaporEnthalpy - isentropicEfficiency * enthalpyDrop
  const quality: number =
    (exhaustEnthalpy - exhaust.liquidEnthalpy) / (exhaust.vaporEnthalpy - exhaust.liquidEnthalpy)
  return Math.max(0, Math.min(1, quality))
}
