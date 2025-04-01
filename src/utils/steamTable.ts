// Steam table data from 80°C to 300°C
// Data includes: temperature (°C), pressure (bar), specific volume (m³/kg), enthalpy (kJ/kg), specific heat (kJ/kg°C), latent heat (kJ/kg)
export type SteamData = {
  temperature: number;
  pressure: number;
  specificVolume: number;
  enthalpy: number;
  specificHeat: number;
  latentHeat: number;
}

export const steamTable: SteamData[] = [
  { temperature: 80, pressure: 0.474, specificVolume: 0.001029, enthalpy: 335.0, specificHeat: 4.196, latentHeat: 2308 },
  { temperature: 85, pressure: 0.579, specificVolume: 0.001033, enthalpy: 356.1, specificHeat: 4.203, latentHeat: 2296 },
  { temperature: 90, pressure: 0.702, specificVolume: 0.001036, enthalpy: 377.0, specificHeat: 4.208, latentHeat: 2283 },
  { temperature: 95, pressure: 0.845, specificVolume: 0.001040, enthalpy: 398.0, specificHeat: 4.213, latentHeat: 2270 },
  { temperature: 98, pressure: 0.946, specificVolume: 0.001042, enthalpy: 410.9, specificHeat: 4.216, latentHeat: 2262 }, // Starting point
  { temperature: 100, pressure: 1.013, specificVolume: 0.001043, enthalpy: 419.1, specificHeat: 4.219, latentHeat: 2257 },
  { temperature: 105, pressure: 1.208, specificVolume: 0.001047, enthalpy: 440.2, specificHeat: 4.226, latentHeat: 2243 },
  { temperature: 110, pressure: 1.433, specificVolume: 0.001051, enthalpy: 461.3, specificHeat: 4.233, latentHeat: 2230 },
  { temperature: 115, pressure: 1.691, specificVolume: 0.001055, enthalpy: 482.5, specificHeat: 4.240, latentHeat: 2216 },
  { temperature: 120, pressure: 1.985, specificVolume: 0.001060, enthalpy: 503.7, specificHeat: 4.248, latentHeat: 2202 },
  { temperature: 125, pressure: 2.321, specificVolume: 0.001064, enthalpy: 525.0, specificHeat: 4.257, latentHeat: 2188 },
  { temperature: 130, pressure: 2.701, specificVolume: 0.001069, enthalpy: 546.3, specificHeat: 4.267, latentHeat: 2174 },
  { temperature: 135, pressure: 3.130, specificVolume: 0.001073, enthalpy: 567.7, specificHeat: 4.278, latentHeat: 2160 },
  { temperature: 140, pressure: 3.613, specificVolume: 0.001078, enthalpy: 589.1, specificHeat: 4.290, latentHeat: 2145 },
  { temperature: 145, pressure: 4.155, specificVolume: 0.001083, enthalpy: 610.6, specificHeat: 4.303, latentHeat: 2130 },
  { temperature: 150, pressure: 4.760, specificVolume: 0.001088, enthalpy: 632.2, specificHeat: 4.317, latentHeat: 2114 },
  { temperature: 155, pressure: 5.433, specificVolume: 0.001094, enthalpy: 653.9, specificHeat: 4.332, latentHeat: 2098 },
  { temperature: 160, pressure: 6.178, specificVolume: 0.001099, enthalpy: 675.6, specificHeat: 4.349, latentHeat: 2082 },
  { temperature: 165, pressure: 7.000, specificVolume: 0.001105, enthalpy: 697.4, specificHeat: 4.367, latentHeat: 2066 },
  { temperature: 170, pressure: 7.904, specificVolume: 0.001111, enthalpy: 719.3, specificHeat: 4.386, latentHeat: 2050 },
  { temperature: 175, pressure: 8.895, specificVolume: 0.001117, enthalpy: 741.3, specificHeat: 4.406, latentHeat: 2033 },
  { temperature: 180, pressure: 9.979, specificVolume: 0.001124, enthalpy: 763.4, specificHeat: 4.428, latentHeat: 2015 },
  { temperature: 185, pressure: 11.16, specificVolume: 0.001130, enthalpy: 785.5, specificHeat: 4.452, latentHeat: 1997 },
  { temperature: 190, pressure: 12.45, specificVolume: 0.001137, enthalpy: 807.8, specificHeat: 4.477, latentHeat: 1979 },
  { temperature: 195, pressure: 13.85, specificVolume: 0.001144, enthalpy: 830.1, specificHeat: 4.504, latentHeat: 1960 },
  { temperature: 200, pressure: 15.34, specificVolume: 0.001152, enthalpy: 852.6, specificHeat: 4.532, latentHeat: 1941 },
  { temperature: 210, pressure: 18.65, specificVolume: 0.001167, enthalpy: 897.9, specificHeat: 4.594, latentHeat: 1902 },
  { temperature: 220, pressure: 22.44, specificVolume: 0.001184, enthalpy: 943.8, specificHeat: 4.663, latentHeat: 1861 },
  { temperature: 230, pressure: 26.75, specificVolume: 0.001202, enthalpy: 990.3, specificHeat: 4.740, latentHeat: 1818 },
  { temperature: 240, pressure: 31.63, specificVolume: 0.001222, enthalpy: 1037.6, specificHeat: 4.826, latentHeat: 1774 },
  { temperature: 250, pressure: 37.13, specificVolume: 0.001243, enthalpy: 1085.8, specificHeat: 4.921, latentHeat: 1728 },
  { temperature: 260, pressure: 43.31, specificVolume: 0.001266, enthalpy: 1134.9, specificHeat: 5.027, latentHeat: 1680 },
  { temperature: 270, pressure: 50.22, specificVolume: 0.001292, enthalpy: 1185.2, specificHeat: 5.145, latentHeat: 1628 },
  { temperature: 280, pressure: 57.92, specificVolume: 0.001320, enthalpy: 1236.8, specificHeat: 5.276, latentHeat: 1574 },
  { temperature: 290, pressure: 66.46, specificVolume: 0.001351, enthalpy: 1289.9, specificHeat: 5.422, latentHeat: 1516 },
  { temperature: 300, pressure: 75.89, specificVolume: 0.001387, enthalpy: 1344.8, specificHeat: 5.584, latentHeat: 1453 },
  { temperature: 500, pressure: 230.9, specificVolume: 0.0015, enthalpy: 2380.8, specificHeat: 5.70, latentHeat: 0 },
];

// Helper function to get steam data through interpolation
export function getSteamData(temperature: number): SteamData {
  // Clamp temperature to valid range
  const clampedTemp = Math.max(80, Math.min(300, temperature));
  
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
