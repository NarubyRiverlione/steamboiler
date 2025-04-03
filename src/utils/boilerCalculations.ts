// Constants and utility functions for boiler calculations
import { CstPhysics, CstSimulation } from "../context/const"
import { getSteamData, getWaterSpecificHeat, getLatentHeat, getBoilingPoint } from "./steamTable"

const { CstBoiler } = CstSimulation

// Calculate water volume based on temperature using specific volume data from steam table
export function calculateWaterVolume(baseVolume: number, temperature: number): number {
  // Reference conditions at 20°C
  const referenceSpecificVolume = 0.001002 // Specific volume at 20°C (m³/kg)

  // Get current specific volume from steam table or use approximation for temps below 80°C
  let currentSpecificVolume

  if (temperature < 80) {
    // Linear approximation for temperatures below 80°C
    // Specific volume increases with temperature
    const specificVolumeAt0C = 0.001 // m³/kg at 0°C
    const specificVolumeAt80C = 0.001029 // m³/kg at 80°C (from steam table)
    const slope = (specificVolumeAt80C - specificVolumeAt0C) / 80
    currentSpecificVolume = specificVolumeAt0C + slope * temperature
  } else {
    // Use steam table data for temperatures >= 80°C
    const steamData = getSteamData(temperature)
    currentSpecificVolume = steamData.specificVolume
  }

  // Calculate volume ratio based on specific volumes
  // Volume is proportional to specific volume
  const volumeRatio = currentSpecificVolume / referenceSpecificVolume

  // Apply the volume ratio to the base volume
  return baseVolume * volumeRatio
}

// Calculate energy from gas flow
export function calculateGasEnergy(gasFlow: number): number {
  // gasFlow in liters/second
  return (gasFlow / 1000) * CstPhysics.GasEnergyDensity * CstBoiler.GasEfficiency
}

// Calculate energy needed to heat water
export function calculateHeatingEnergy(waterMass: number, currentTemp: number, targetTemp: number): number {
  // Use temperature-dependent specific heat
  // For better accuracy, we should integrate the specific heat over the temperature range
  // but for simplicity, we'll use the average specific heat in the range
  const avgTemp = (currentTemp + targetTemp) / 2
  const specificHeat = getWaterSpecificHeat(avgTemp)

  return waterMass * specificHeat * (targetTemp - currentTemp)
}
/*
// Calculate new temperature based on current energy and added energy
export function calculateNewTemperature(waterMass: number, currentTemp: number, addedEnergy: number): number {
  // If no water, temperature doesn't change
  if (waterMass <= 0) return currentTemp

  // Use temperature-dependent specific heat
  // This is an approximation since specific heat changes with temperature
  // For small temperature changes, this approximation is reasonable
  const specificHeat = getWaterSpecificHeat(currentTemp)

  return currentTemp + addedEnergy / (waterMass * specificHeat)
}
*/
// Calculate boiling point based on pressure
export function calculateBoilingPoint(pressure: number): number {
  // Use the getBoilingPoint function from steamTable.ts
  return getBoilingPoint(pressure)
}

// Calculate pressure based on steam mass, temperature, and available volume
export function calculatePressureFromSteam(
  steamMass: number,
  temperature: number,
  availableVolume: number,
  saturationPressure: number,
): number {
  // If no steam or no available volume, return saturation pressure
  if (steamMass <= 0 || availableVolume <= 0) {
    return saturationPressure
  }

  // Convert available volume from liters to m³
  const availableVolumeM3 = availableVolume / 1000

  // Get specific volume of steam at current temperature and saturation pressure
  // This is an approximation, as the specific volume also depends on pressure
  const steamData = getSteamData(temperature)

  // Specific volume of saturated steam at this temperature (m³/kg)
  // For superheated steam, this would be higher, but we'll use this as a lower bound
  // The expansion factor is temperature-dependent
  // At lower temperatures, the expansion factor is higher
  let expansionFactor
  if (temperature < 100) {
    expansionFactor = CstPhysics.SteamExpansionFactorLow // For temperatures < 100°C
  } else if (temperature < 150) {
    expansionFactor = CstPhysics.SteamExpansionFactorMedium // For temperatures 100-150°C
  } else {
    expansionFactor = CstPhysics.SteamExpansionFactorHigh // For temperatures > 150°C
  }

  const specificVolumeSteam = steamData.specificVolume * expansionFactor

  // Calculate the volume that the steam would occupy at saturation pressure
  const steamVolumeAtSaturation = steamMass * specificVolumeSteam

  // If the steam volume at saturation is less than the available volume,
  // then the pressure is just the saturation pressure
  if (steamVolumeAtSaturation <= availableVolumeM3) {
    return saturationPressure
  }

  // Otherwise, calculate the pressure using a simplified equation of state
  // P1 * V1 = P2 * V2 (assuming constant temperature)
  // P2 = P1 * (V1 / V2)
  // Apply a damping factor to make pressure rise more gradually
  const volumeRatio = steamVolumeAtSaturation / availableVolumeM3

  // Apply a square root function to the volume ratio to make pressure rise more gradually
  // This is a common approach in thermodynamics to model non-ideal gas behavior
  // and to account for the fact that steam doesn't behave exactly like an ideal gas
  const dampedRatio = Math.sqrt(volumeRatio)

  // Apply an additional damping factor to slow down pressure rise even more
  // Use the configurable damping factor from CstBoiler
  const pressureFactor = 1 + (dampedRatio - 1) * CstBoiler.PressureDampingFactor

  const calculatedPressure = saturationPressure * pressureFactor

  // Return the calculated pressure, ensuring it's at least the saturation pressure
  return Math.max(saturationPressure, calculatedPressure)
}

// Calculate steam generation rate
export function calculateSteamGeneration(waterMass: number, temperature: number, pressure: number): number {
  if (waterMass <= 0) {
    return 0
  }

  const boilingPoint = calculateBoilingPoint(pressure)
  if (temperature <= boilingPoint) {
    return 0
  }

  // Calculate energy from gas flow
  const gasEnergy = calculateGasEnergy(CstBoiler.MaxGasFlow) // Assuming max gas flow for calculation

  // Calculate energy needed to heat water to boiling point
  const heatingEnergy = calculateHeatingEnergy(waterMass, temperature, boilingPoint)

  // Calculate heat loss
  const heatLoss = gasEnergy * CstBoiler.HeatLossPercentage

  // Determine the remaining energy available for steam generation
  const availableEnergy = gasEnergy - heatingEnergy - heatLoss

  if (availableEnergy <= 0) {
    return 0
  }

  const latentHeat = getLatentHeat(boilingPoint)

  // Calculate the steam generation rate
  const steamMassFromEnergy = (availableEnergy * CstSimulation.DeltaTime) / latentHeat

  return steamMassFromEnergy
}

// Calculate energy loss from steam generation
export function calculateSteamEnergyLoss(steamRate: number, temperature: number): number {
  // Energy needed to convert water to steam
  // This is the latent heat of vaporization
  // Get accurate latent heat from steam table data
  const latentHeat = getLatentHeat(temperature)

  return steamRate * latentHeat
}
