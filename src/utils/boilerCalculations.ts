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
    const baseGeneration = temperature >= 100 ? 0.005 * waterMass : 0

    // Add additional generation based on excess temperature
    return baseGeneration + excessTemp * waterMass * 0.01
  }

  // Below 100°C, only generate steam if above the boiling point for the current pressure
  const boilingPoint = calculateBoilingPoint(pressure)
  if (temperature <= boilingPoint) {
    return 0
  }

  // Calculate based on excess temperature
  const excessTemp = Math.max(0, temperature - boilingPoint)
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
