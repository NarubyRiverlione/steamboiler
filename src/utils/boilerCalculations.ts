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
  const specificHeat = getWaterSpecificHeat(avgTemp) // kJ/kg°C

  return waterMass * specificHeat * (targetTemp - currentTemp) // kJ
}

// Calculate boiling point based on pressure
export function calculateBoilingPoint(pressure: number): number {
  // Use the getBoilingPoint function from steamTable.ts
  return getBoilingPoint(pressure)
}

// Calculate pressure based on steam mass, temperature, and available volume
export function calculatePressureFromSteam(
  steamMass: number,
  temperature: number,
  availableVolume: number, // Liters
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

// Split the energy put into the water between heating it to saturation and vaporising it
export type EnergyBalance = {
  newTemperature: number // °C
  steamMass: number // kg generated
  heatingEnergy: number // kJ spent heating water up to the boiling point
  vaporisationEnergy: number // kJ spent vaporising
}

// Heat to the boiling point first; only the energy beyond that vaporises water at the latent heat
export function calculateEnergyBalance(
  waterMass: number,
  temperature: number,
  pressure: number,
  energyIn: number,
): EnergyBalance {
  if (waterMass <= 0) {
    return { newTemperature: temperature, steamMass: 0, heatingEnergy: 0, vaporisationEnergy: 0 }
  }

  const boilingPoint = calculateBoilingPoint(pressure)
  // Water already above the boiling point (the pressure model lags) has nothing left to heat
  const energyToBoil = Math.max(0, calculateHeatingEnergy(waterMass, temperature, boilingPoint)) // kJ

  if (energyIn < energyToBoil) {
    // Not enough to reach (or stay at) the boiling point: it all changes the water temperature
    const specificHeat = getWaterSpecificHeat(temperature)
    return {
      newTemperature: temperature + energyIn / (waterMass * specificHeat),
      steamMass: 0,
      heatingEnergy: energyIn,
      vaporisationEnergy: 0,
    }
  }

  const steamMass = Math.min(waterMass, (energyIn - energyToBoil) / getLatentHeat(boilingPoint))
  return {
    newTemperature: Math.max(boilingPoint, temperature),
    steamMass,
    heatingEnergy: energyToBoil,
    vaporisationEnergy: steamMass * getLatentHeat(boilingPoint),
  }
}

