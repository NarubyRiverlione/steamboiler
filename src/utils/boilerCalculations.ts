// Constants and utility functions for boiler calculations
import { CstPhysics, CstSimulation } from "../context/const"
import { getWaterDensity, getWaterSpecificHeat, getLatentHeat } from "./steamTable"

// Calculate water volume based on temperature (thermal expansion)
export function calculateWaterVolume(baseVolume: number, temperature: number): number {
  // Use the density at reference temperature (20°C) and at the current temperature
  // to calculate the volume change
  const referenceTemp = 20 // Reference temperature
  const referenceDensity = 998 // kg/m³ at 20°C (approximate)
  
  // Get current density from the steam table (or use approximation for temps below 80°C)
  const currentDensity = temperature < 80 ? 
    referenceDensity * (1 - 0.0002 * (temperature - referenceTemp)) : // Simple approximation below 80°C
    getWaterDensity(temperature); // Use steam table data above 80°C
  
  // Volume is inversely proportional to density
  return baseVolume * (referenceDensity / currentDensity);
}

// Calculate energy from gas flow
export function calculateGasEnergy(gasFlow: number): number {
  // gasFlow in liters/second
  return (gasFlow / 1000) * CstPhysics.GasEnergyDensity * CstSimulation.GasEfficiency
}

// Calculate energy needed to heat water
export function calculateHeatingEnergy(waterMass: number, currentTemp: number, targetTemp: number): number {
  // Use temperature-dependent specific heat
  // For better accuracy, we should integrate the specific heat over the temperature range
  // but for simplicity, we'll use the average specific heat in the range
  const avgTemp = (currentTemp + targetTemp) / 2;
  const specificHeat = getWaterSpecificHeat(avgTemp);
  
  return waterMass * specificHeat * (targetTemp - currentTemp);
}

// Calculate new temperature based on current energy and added energy
export function calculateNewTemperature(waterMass: number, currentTemp: number, addedEnergy: number): number {
  // If no water, temperature doesn't change
  if (waterMass <= 0) return currentTemp;

  // Use temperature-dependent specific heat
  // This is an approximation since specific heat changes with temperature
  // For small temperature changes, this approximation is reasonable
  const specificHeat = getWaterSpecificHeat(currentTemp);
  
  return currentTemp + addedEnergy / (waterMass * specificHeat);
}

// Calculate boiling point based on pressure
export function calculateBoilingPoint(pressure: number): number {
  // Simple approximation: boiling temp increases with pressure
  // At standard pressure (1.013 bar), water boils at 100°C
  return pressure <= CstPhysics.AtmosphericPressure
    ? 100
    : 100 * Math.pow(pressure / CstPhysics.AtmosphericPressure, 0.25)
}

// Calculate steam generation rate
export function calculateSteamGeneration(waterMass: number, temperature: number, pressure: number): number {
  // If there's no water, there can't be steam generation
  if (waterMass <= 0) {
    return 0
  }

  // Special case: If temperature is at or above 100°C and pressure is at or above atmospheric,
  // we guarantee some steam generation to break the feedback loop
  if (temperature >= 100) {
    // Get boiling point for current pressure
    const boilingPoint = calculateBoilingPoint(pressure)

    // Calculate excess temperature (how far above boiling point)
    const excessTemp = Math.max(0, temperature - boilingPoint)

    // Ensure some minimum steam generation at or above 100°C
    const baseGeneration = temperature >= 100 ? 0.01 * waterMass : 0 // Increased base rate (x20)

    // Add additional generation based on excess temperature
    return baseGeneration + excessTemp * waterMass * 0.02 // Increased factor for excess temp (x20)
  }

  // Below 100°C, only generate steam if above the boiling point for the current pressure
  const boilingPoint = calculateBoilingPoint(pressure)
  if (temperature <= boilingPoint) {
    return 0
  }

  // Calculate based on excess temperature
  const excessTemp = Math.max(0, temperature - boilingPoint)
  return excessTemp * waterMass * 0.01
}

// Calculate energy loss from steam generation
export function calculateSteamEnergyLoss(steamRate: number, temperature: number): number {
  // Energy needed to convert water to steam
  // This is the latent heat of vaporization
  // Get accurate latent heat from steam table data
  const latentHeat = getLatentHeat(temperature);

  return steamRate * latentHeat;
}
