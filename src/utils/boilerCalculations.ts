// Constants and utility functions for boiler calculations
import { CstPhysics, CstSimulation } from "../context/const"

// Calculate water volume based on temperature (thermal expansion)
export function calculateWaterVolume(baseVolume: number, temperature: number): number {
  // Simple thermal expansion model (approximate)
  // Coefficient of thermal expansion for water ~0.0002 per °C
  const expansionCoefficient = 0.0002
  const referenceTemp = 20 // Reference temperature

  return baseVolume * (1 + expansionCoefficient * (temperature - referenceTemp))
}

// Calculate energy from gas flow
export function calculateGasEnergy(gasFlow: number): number {
  // gasFlow in liters/second
  return (gasFlow / 1000) * CstPhysics.GasEnergyDensity * CstSimulation.GasEfficiency
}

// Calculate energy needed to heat water
export function calculateHeatingEnergy(waterMass: number, currentTemp: number, targetTemp: number): number {
  // Specific heat capacity of water ~4.18 kJ/kg°C
  const specificHeat = 4.18
  return waterMass * specificHeat * (targetTemp - currentTemp)
}

// Calculate new temperature based on current energy and added energy
export function calculateNewTemperature(waterMass: number, currentTemp: number, addedEnergy: number): number {
  // If no water, temperature doesn't change
  if (waterMass <= 0) return currentTemp

  // Specific heat capacity of water ~4.18 kJ/kg°C
  const specificHeat = 4.18
  return currentTemp + addedEnergy / (waterMass * specificHeat)
}

// Calculate steam generation rate
export function calculateSteamGeneration(waterMass: number, temperature: number, pressure: number): number {
  // If there's no water, there can't be steam generation
  if (waterMass <= 0) {
    return 0
  }

  // Calculate boiling point based on pressure
  // Simple approximation: boiling temp increases with pressure
  // At standard pressure (1.013 bar), water boils at 100°C
  const boilingPoint = 100 * Math.pow(pressure / CstPhysics.AtmosphericPressure, 0.25)

  // No steam generation below boiling point
  if (temperature < boilingPoint) {
    return 0
  }

  // Simple model: excess energy above boiling point goes to steam generation
  // This is a simplified model - in reality it depends on many factors
  const excessTemp = Math.max(0, temperature - boilingPoint)

  // Increase the factor significantly for more noticeable steam generation
  // Original factor was 0.0005, which was too small
  return excessTemp * waterMass * 0.005
}

// Calculate energy loss from steam generation
export function calculateSteamEnergyLoss(steamRate: number, temperature: number): number {
  // Energy needed to convert water to steam
  // This is the latent heat of vaporization
  // It decreases as temperature increases (approximation)
  // At 100°C, it's about 2260 kJ/kg, decreasing to ~1700 kJ/kg at higher temperatures
  const baseLatentHeat = 2260 // kJ/kg at 100°C
  const temperatureFactor = Math.max(0, 1 - (temperature - 100) / 300)
  const latentHeat = baseLatentHeat * temperatureFactor + 1700 * (1 - temperatureFactor)

  return steamRate * latentHeat
}
