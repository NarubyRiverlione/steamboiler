// Steam table data from 80°C to 300°C
// Data includes: temperature (°C), pressure (bar), specific volume (m³/kg), enthalpy (kJ/kg), specific heat (kJ/kg°C)
export type SteamData = {
  temperature: number;
  pressure: number;
  specificVolume: number;
  enthalpy: number;
  specificHeat: number;
}

export const steamTable: SteamData[] = [
  { temperature: 80, pressure: 0.474, specificVolume: 0.001029, enthalpy: 335.0, specificHeat: 4.196 },
  { temperature: 85, pressure: 0.579, specificVolume: 0.001033, enthalpy: 356.1, specificHeat: 4.203 },
  { temperature: 90, pressure: 0.702, specificVolume: 0.001036, enthalpy: 377.0, specificHeat: 4.208 },
  { temperature: 95, pressure: 0.845, specificVolume: 0.001040, enthalpy: 398.0, specificHeat: 4.213 },
  { temperature: 98, pressure: 0.946, specificVolume: 0.001042, enthalpy: 410.9, specificHeat: 4.216 }, // Starting point
  { temperature: 100, pressure: 1.013, specificVolume: 0.001043, enthalpy: 419.1, specificHeat: 4.219 },
  { temperature: 105, pressure: 1.208, specificVolume: 0.001047, enthalpy: 440.2, specificHeat: 4.226 },
  { temperature: 110, pressure: 1.433, specificVolume: 0.001051, enthalpy: 461.3, specificHeat: 4.233 },
  { temperature: 115, pressure: 1.691, specificVolume: 0.001055, enthalpy: 482.5, specificHeat: 4.240 },
  { temperature: 120, pressure: 1.985, specificVolume: 0.001060, enthalpy: 503.7, specificHeat: 4.248 },
  { temperature: 125, pressure: 2.321, specificVolume: 0.001064, enthalpy: 525.0, specificHeat: 4.257 },
  { temperature: 130, pressure: 2.701, specificVolume: 0.001069, enthalpy: 546.3, specificHeat: 4.267 },
  { temperature: 135, pressure: 3.130, specificVolume: 0.001073, enthalpy: 567.7, specificHeat: 4.278 },
  { temperature: 140, pressure: 3.613, specificVolume: 0.001078, enthalpy: 589.1, specificHeat: 4.290 },
  { temperature: 145, pressure: 4.155, specificVolume: 0.001083, enthalpy: 610.6, specificHeat: 4.303 },
  { temperature: 150, pressure: 4.760, specificVolume: 0.001088, enthalpy: 632.2, specificHeat: 4.317 },
  { temperature: 155, pressure: 5.433, specificVolume: 0.001094, enthalpy: 653.9, specificHeat: 4.332 },
  { temperature: 160, pressure: 6.178, specificVolume: 0.001099, enthalpy: 675.6, specificHeat: 4.349 },
  { temperature: 165, pressure: 7.000, specificVolume: 0.001105, enthalpy: 697.4, specificHeat: 4.367 },
  { temperature: 170, pressure: 7.904, specificVolume: 0.001111, enthalpy: 719.3, specificHeat: 4.386 },
  { temperature: 175, pressure: 8.895, specificVolume: 0.001117, enthalpy: 741.3, specificHeat: 4.406 },
  { temperature: 180, pressure: 9.979, specificVolume: 0.001124, enthalpy: 763.4, specificHeat: 4.428 },
  { temperature: 185, pressure: 11.16, specificVolume: 0.001130, enthalpy: 785.5, specificHeat: 4.452 },
  { temperature: 190, pressure: 12.45, specificVolume: 0.001137, enthalpy: 807.8, specificHeat: 4.477 },
  { temperature: 195, pressure: 13.85, specificVolume: 0.001144, enthalpy: 830.1, specificHeat: 4.504 },
  { temperature: 200, pressure: 15.34, specificVolume: 0.001152, enthalpy: 852.6, specificHeat: 4.532 },
  { temperature: 210, pressure: 18.65, specificVolume: 0.001167, enthalpy: 897.9, specificHeat: 4.594 },
  { temperature: 220, pressure: 22.44, specificVolume: 0.001184, enthalpy: 943.8, specificHeat: 4.663 },
  { temperature: 230, pressure: 26.75, specificVolume: 0.001202, enthalpy: 990.3, specificHeat: 4.740 },
  { temperature: 240, pressure: 31.63, specificVolume: 0.001222, enthalpy: 1037.6, specificHeat: 4.826 },
  { temperature: 250, pressure: 37.13, specificVolume: 0.001243, enthalpy: 1085.8, specificHeat: 4.921 },
  { temperature: 260, pressure: 43.31, specificVolume: 0.001266, enthalpy: 1134.9, specificHeat: 5.027 },
  { temperature: 270, pressure: 50.22, specificVolume: 0.001292, enthalpy: 1185.2, specificHeat: 5.145 },
  { temperature: 280, pressure: 57.92, specificVolume: 0.001320, enthalpy: 1236.8, specificHeat: 5.276 },
  { temperature: 290, pressure: 66.46, specificVolume: 0.001351, enthalpy: 1289.9, specificHeat: 5.422 },
  { temperature: 300, pressure: 75.89, specificVolume: 0.001387, enthalpy: 1344.8, specificHeat: 5.584 },
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
