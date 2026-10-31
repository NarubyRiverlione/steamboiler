// Constants and utility functions for boiler calculations
import { CstPhysics, CstSimulation } from "../context/const"
import { getSteamData, getSaturatedSteamDensity, getWaterSpecificHeat, getLatentHeat, getBoilingPoint } from "./steamTable"

const { CstBoiler } = CstSimulation

const EquilibriumTolerance = 1e-9 // kg
const FlashIterations = 40 // bisection steps: the bracket is tonnes wide, 40 halvings is far below a gram

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

// Boiler pressure: the saturation pressure of the water temperature, never below atmospheric (ADR 0001)
export function calculateBoilerPressure(temperature: number): number {
  return Math.max(CstPhysics.AtmosphericPressure_mBar / 1e3, getSteamData(temperature).pressure)
}

// Steam the free volume holds at saturation (kg): saturated steam in the steam space, or the vapour over the
// water in a vented drum below the boiling point
export function calculateSteamInventory(temperature: number, waterVolume: number): number {
  const steamSpaceM3 = Math.max(0, CstBoiler.TotalVolume - waterVolume) / 1000
  return steamSpaceM3 * getSaturatedSteamDensity(temperature)
}

// Mass that flashes from the water to steam in a tick (kg, negative: steam condenses) to restore the saturated
// steam inventory. Solved implicitly, because flashing cools the water (less steam wanted) and shrinks the water
// volume (more steam space), and an explicit step oscillates near the critical point. Bisection on the residual.
export function calculateFlashedMass(
  heatedTemperature: number,
  waterMass: number,
  waterVolume: number,
  steamMass: number,
): number {
  if (waterMass <= 0) return 0
  const latentHeat = getLatentHeat(heatedTemperature)
  const heatCapacity = waterMass * getWaterSpecificHeat(heatedTemperature)
  const litresPerKg = calculateWaterVolume(1, heatedTemperature)

  // Steam still wanted after flashing this much, minus what is already there and what was just flashed
  const residual = (flashed: number): number => {
    const temperature = Math.max(0, heatedTemperature - (flashed * latentHeat) / heatCapacity)
    const volume = Math.min(CstBoiler.TotalVolume, Math.max(0, waterVolume - flashed * litresPerKg))
    return calculateSteamInventory(temperature, volume) - steamMass - flashed
  }

  // Already in equilibrium (within a microgram): nothing flashes, and a resting boiler stays exactly at rest
  if (Math.abs(residual(0)) < EquilibriumTolerance) return 0

  let low = -steamMass
  let high = waterMass
  if (residual(low) <= 0) return low
  if (residual(high) >= 0) return high
  for (let i = 0; i < FlashIterations; i++) {
    const mid = (low + high) / 2
    if (residual(mid) > 0) low = mid
    else high = mid
  }
  return (low + high) / 2
}
