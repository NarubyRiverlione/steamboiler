import { SteamData, steamTable } from "./steamData";


// Helper function to get steam data through interpolation
export function getSteamData(temperature: number): SteamData {
  // Clamp temperature to valid range
  const clampedTemp = Math.max(80, Math.min(500, temperature));
  
  // Find two closest data points
  let lower = steamTable[0];
  let upper = steamTable[steamTable.length - 1];
  
  for (let i = 0; i < steamTable.length - 1; i++) {
    if (steamTable[i].temperature <= clampedTemp && steamTable[i + 1].temperature >= clampedTemp) {
      lower = steamTable[i];
      upper = steamTable[i + 1];
      break;
    }
  }
  
  // If exact match, return the data point
  if (lower.temperature === clampedTemp) {
    return lower;
  }
  
  // Interpolate between the two points
  const ratio = (clampedTemp - lower.temperature) / (upper.temperature - lower.temperature);
  
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

// Get boiling point of water based on pressure (°C)
export function getBoilingPoint(pressure: number): number {
  // For pressures below our table range, use the Antoine equation
  if (pressure < steamTable[0].pressure) {
    // Antoine equation: log10(P) = A - B/(C + T)
    // Where P is pressure in mmHg, T is temperature in °C
    // Constants for water: A = 8.07131, B = 1730.63, C = 233.426
    // These are valid for 1-200 mmHg, which is about 0.0013-0.267 bar
    
    // Convert pressure from bar to mmHg
    const pressureInMmHg = pressure * 750.062;
    
    // If pressure is too low, return a minimum temperature
    if (pressureInMmHg < 1) {
      return 0; // Minimum temperature
    }
    
    // Calculate temperature using Antoine equation
    const A = 8.07131;
    const B = 1730.63;
    const C = 233.426;
    
    const logP = Math.log10(pressureInMmHg);
    const temperature = B / (A - logP) - C;
    
    return Math.max(0, temperature); // Ensure temperature is not negative
  }
  
  // For pressures above our table range, use a simple extrapolation
  if (pressure > steamTable[steamTable.length - 1].pressure) {
    // Simple power law extrapolation
    // T = T_ref * (P/P_ref)^0.25
    const refData = steamTable[steamTable.length - 1];
    return refData.temperature * Math.pow(pressure / refData.pressure, 0.25);
  }
  
  // Find two closest data points
  let lower = steamTable[0];
  let upper = steamTable[steamTable.length - 1];
  
  for (let i = 0; i < steamTable.length - 1; i++) {
    if (steamTable[i].pressure <= pressure && steamTable[i + 1].pressure >= pressure) {
      lower = steamTable[i];
      upper = steamTable[i + 1];
      break;
    }
  }
  
  // If exact match, return the data point
  if (lower.pressure === pressure) {
    return lower.temperature;
  }
  
  // Interpolate between the two points
  const ratio = (pressure - lower.pressure) / (upper.pressure - lower.pressure);
  return lower.temperature + ratio * (upper.temperature - lower.temperature);
}
