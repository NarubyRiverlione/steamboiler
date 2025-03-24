import { getSteamData } from './steamTable';

// Constants
export const BOILER_TOTAL_VOLUME = 100; // liters
export const WATER_DENSITY = 1000; // kg/m³
export const NATURAL_COOLING_RATE = 1 / 15; // °C per second
export const GAS_EFFICIENCY = 0.85; // 85% efficiency
export const GAS_ENERGY_DENSITY = 35000; // kJ/m³ (approximate energy density of natural gas)
export const FILLING_RATE = 0.005; // 0.5% per second
export const DRAINING_RATE = 0.005; // 0.5% per second
export const ATMOSPHERIC_PRESSURE = 1.013; // bar

// Calculate water volume based on temperature (thermal expansion)
export function calculateWaterVolume(baseVolume: number, temperature: number): number {
  // Simple thermal expansion model (approximate)
  // Coefficient of thermal expansion for water ~0.0002 per °C
  const expansionCoefficient = 0.0002;
  const referenceTemp = 20; // Reference temperature
  
  return baseVolume * (1 + expansionCoefficient * (temperature - referenceTemp));
}

// Calculate energy from gas flow
export function calculateGasEnergy(gasFlow: number): number {
  // gasFlow in liters/second
  return (gasFlow / 1000) * GAS_ENERGY_DENSITY * GAS_EFFICIENCY;
}

// Calculate energy needed to heat water
export function calculateHeatingEnergy(
  waterMass: number, 
  currentTemp: number, 
  targetTemp: number
): number {
  // Specific heat capacity of water ~4.18 kJ/kg°C
  const specificHeat = 4.18;
  return waterMass * specificHeat * (targetTemp - currentTemp);
}

// Calculate new temperature based on current energy and added energy
export function calculateNewTemperature(
  waterMass: number, 
  currentTemp: number, 
  addedEnergy: number
): number {
  // If no water, temperature doesn't change
  if (waterMass <= 0) return currentTemp;
  
  // Specific heat capacity of water ~4.18 kJ/kg°C
  const specificHeat = 4.18;
  return currentTemp + (addedEnergy / (waterMass * specificHeat));
}

// Calculate steam generation rate
export function calculateSteamGeneration(
  waterMass: number, 
  temperature: number, 
  pressure: number
): number {
  // No steam generation below 100°C at standard pressure
  if (temperature < 100 && pressure <= ATMOSPHERIC_PRESSURE) {
    return 0;
  }
  
  // Get steam data for enthalpy calculation
  const steamData = getSteamData(temperature);
  
  // Simple model: excess energy above boiling point goes to steam generation
  // This is a simplified model - in reality it depends on many factors
  const excessTemp = Math.max(0, temperature - steamData.temperature);
  
  // Approximate steam generation rate (kg/s)
  // Higher excess temperature and lower pressure lead to more steam
  return (excessTemp * waterMass * 0.0001) / Math.sqrt(pressure);
}

// Calculate energy loss from steam generation
export function calculateSteamEnergyLoss(steamRate: number): number {
  // Energy needed to convert water to steam
  // This is the latent heat of vaporization
  const latentHeat = 2250; // Approximate value in kJ/kg
  
  return steamRate * latentHeat;
}