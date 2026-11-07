// Constants and utility functions for boiler calculations
import { CstPhysics, CstSimulation } from "../context/const"
import {
  getSteamData,
  getWaterSpecificVolume,
  getSaturatedSteamDensity,
  getWaterSpecificHeat,
  getLatentHeat,
  getBoilingPoint,
} from "./steamTable"
import { calculateFlueGasHeatBalance } from "./flueGas"

const { CstBoiler, CstTurbine } = CstSimulation

// √(P·ρ) of saturated steam at a pressure (bar): a choked valve passes mass in proportion to it
const chokedFlowTerm = (pressure: number): number =>
  Math.sqrt(pressure * getSaturatedSteamDensity(getBoilingPoint(pressure)))

const RatedChokedFlowTerm: number = chokedFlowTerm(CstTurbine.ValveRatingPressure)

// Share of the valve capacity a valve passes at this boiler pressure (bar): 1 at the rating pressure, above 1 past it,
// since the capacity is a rating and not a cap (ADR 0026)
export function valveFlowFactor(pressure: number): number {
  return chokedFlowTerm(pressure) / RatedChokedFlowTerm
}

const EquilibriumTolerance = 1e-9 // kg
const FlashIterations = 40 // bisection steps: the bracket is tonnes wide, 40 halvings is far below a gram

// Volume (L) a water mass (kg) takes at its temperature
export function waterVolumeOf(waterMass: number, temperature: number): number {
  return waterMass * getWaterSpecificVolume(temperature)
}

// Water mass (kg) a volume (L) holds at its temperature
export function waterMassOf(waterVolume: number, temperature: number): number {
  return waterVolume / getWaterSpecificVolume(temperature)
}

// Mass (kg) a vessel of this capacity (L) can still take at the water temperature; none once it is full or over
export function roomInKg(totalVolume: number, waterVolume: number, temperature: number): number {
  return Math.max(0, totalVolume - waterVolume) / getWaterSpecificVolume(temperature)
}

// Heat (kW) into the boiler water from the gas: the fuel heat less what goes up the stack (ADR 0029). The boiler
// temperature (°C), the Return flow (kg/s) and its inlet temperature (°C, the hotwell) decide how far the flue gas cools.
export function calculateGasEnergy(
  gasFlow: number,
  boilerTemperature: number,
  returnFlow: number,
  returnTemperature: number,
): number {
  // gasFlow in liters/second
  return calculateFlueGasHeatBalance(gasFlow, boilerTemperature, returnFlow, returnTemperature).heatIntoWater
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
  steamMass: number,
): number {
  if (waterMass <= 0) return 0
  const latentHeat = getLatentHeat(heatedTemperature)
  const heatCapacity = waterMass * getWaterSpecificHeat(heatedTemperature)

  // Steam still wanted after flashing this much, minus what is already there and what was just flashed
  const residual = (flashed: number): number => {
    const temperature = Math.max(0, heatedTemperature - (flashed * latentHeat) / heatCapacity)
    const volume = Math.min(
      CstBoiler.TotalVolume,
      waterVolumeOf(Math.max(0, waterMass - flashed), temperature),
    )
    return calculateSteamInventory(temperature, volume) - steamMass - flashed
  }

  // Already in equilibrium (within a microgram): nothing flashes, and a resting boiler stays exactly at rest
  if (Math.abs(residual(0)) < EquilibriumTolerance) return 0
  // At most all the steam condenses, at most all the water flashes
  return findRoot(residual, -steamMass, waterMass)
}

// Root of a decreasing function between low and high by bisection; an end of the bracket when the root lies beyond it
export function findRoot(residual: (x: number) => number, low: number, high: number): number {
  if (residual(low) <= 0) return low
  if (residual(high) >= 0) return high
  for (let i = 0; i < FlashIterations; i++) {
    const mid = (low + high) / 2
    if (residual(mid) > 0) low = mid
    else high = mid
  }
  return (low + high) / 2
}
