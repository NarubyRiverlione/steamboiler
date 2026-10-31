import { type SteamData, steamTable } from "./steamData";


// Last table row: the critical point, where lookups clamp (never throw, the simulation runs this every tick)
const CriticalPoint: SteamData = steamTable[steamTable.length - 1];

// Water cannot be heated past this in the saturated model: above it there is no liquid/steam equilibrium
export const CriticalTemperature: number = CriticalPoint.temperature;

type Bracket = { lower: SteamData; upper: SteamData; ratio: number }

// Find the two table rows around a value of the (ascending) key column and the interpolation ratio between them
function bracket(key: "temperature" | "pressure", value: number): Bracket {
  const index: number = steamTable.findIndex((row, i) => i < steamTable.length - 1 && steamTable[i + 1][key] >= value && row[key] <= value);
  const lower: SteamData = steamTable[Math.max(index, 0)];
  const upper: SteamData = steamTable[Math.max(index, 0) + 1];
  return { lower, upper, ratio: (value - lower[key]) / (upper[key] - lower[key]) };
}

// Helper function to get steam data through interpolation
export function getSteamData(temperature: number): SteamData {
  // Clamp temperature to the table: 80°C up to the critical point
  const clampedTemp = Math.max(steamTable[0].temperature, Math.min(CriticalPoint.temperature, temperature));
  const { lower, upper, ratio } = bracket("temperature", clampedTemp);

  return {
    temperature: clampedTemp,
    pressure: lower.pressure + ratio * (upper.pressure - lower.pressure),
    specificVolume: lower.specificVolume + ratio * (upper.specificVolume - lower.specificVolume),
    enthalpy: lower.enthalpy + ratio * (upper.enthalpy - lower.enthalpy),
    specificHeat: lower.specificHeat + ratio * (upper.specificHeat - lower.specificHeat),
    latentHeat: lower.latentHeat + ratio * (upper.latentHeat - lower.latentHeat),
  };
}

// Get water density based on temperature (kg/m³)
export function getWaterDensity(temperature: number): number {
  const steamData = getSteamData(temperature);
  // Convert specific volume (m³/kg) to density (kg/m³)
  return 1 / steamData.specificVolume;
}

// Get water specific heat based on temperature (kJ/kg°C)
export function getWaterSpecificHeat(temperature: number): number {
  const steamData = getSteamData(temperature);
  return steamData.specificHeat;
}

// Get latent heat of vaporization based on temperature (kJ/kg)
export function getLatentHeat(temperature: number): number {
  // For temperatures below our table range, use the Antoine equation to estimate
  // the saturation temperature, then extrapolate the latent heat
  if (temperature < 80) {
    // Simple extrapolation for temperatures below 80°C
    // Latent heat decreases as temperature increases
    // At 0°C it's about 2500 kJ/kg, at 80°C it's 2308 kJ/kg
    return 2500 - (2500 - 2308) * (temperature / 80);
  }
  
  const steamData = getSteamData(temperature);
  return steamData.latentHeat;
}

// Saturation pressure below the table range (bar), the Antoine equation as in antoineBoilingPoint
function antoineSaturationPressure(temperature: number): number {
  return Math.pow(10, 8.07131 - 1730.63 / (233.426 + temperature)) / 750.062;
}

const SlopeHalfWidth = 5; // K, centred difference for dP/dT, the table is piecewise linear in P
const WaterMolarMass = 0.018015; // kg/mol
const GasConstant = 8.314; // J/mol·K

// Saturated steam density (kg/m³), also the vapour density over water in a vented drum.
// In the table range: Clausius-Clapeyron, vg = vf + hfg / (T * dP/dT), since the table only holds the liquid side.
// Below it: ideal gas at the Antoine saturation pressure (accurate within 1% there).
export function getSaturatedSteamDensity(temperature: number): number {
  if (temperature < steamTable[0].temperature) {
    return (antoineSaturationPressure(temperature) * 1e5 * WaterMolarMass) / (GasConstant * (temperature + 273.15));
  }
  const clamped = Math.min(CriticalPoint.temperature, temperature);
  const slopeBarPerK =
    (getSteamData(clamped + SlopeHalfWidth).pressure - getSteamData(clamped - SlopeHalfWidth).pressure) /
    (2 * SlopeHalfWidth);
  const data = getSteamData(clamped);
  const evaporationVolume = data.latentHeat / ((clamped + 273.15) * slopeBarPerK * 100); // kJ/kg / (K · kPa/K)
  return 1 / (data.specificVolume + evaporationVolume);
}

// Boiling point below the table range (°C), Antoine equation: log10(P) = A - B/(C + T)
// P in mmHg, T in °C; constants for water valid for 1-200 mmHg (about 0.0013-0.267 bar)
function antoineBoilingPoint(pressure: number): number {
  const pressureInMmHg = pressure * 750.062;
  if (pressureInMmHg < 1) {
    return 0; // Minimum temperature
  }
  const A = 8.07131;
  const B = 1730.63;
  const C = 233.426;
  return Math.max(0, B / (A - Math.log10(pressureInMmHg)) - C);
}

// Get boiling point of water based on pressure (°C)
export function getBoilingPoint(pressure: number): number {
  if (pressure < steamTable[0].pressure) {
    return antoineBoilingPoint(pressure);
  }

  // Above the critical pressure there is no boiling point: clamp to the critical point
  if (pressure >= CriticalPoint.pressure) {
    return CriticalPoint.temperature;
  }

  const { lower, upper, ratio } = bracket("pressure", pressure);
  return lower.temperature + ratio * (upper.temperature - lower.temperature);
}
