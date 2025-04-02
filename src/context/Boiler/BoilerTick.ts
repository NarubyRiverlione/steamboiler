import {
  calculateSteamGeneration,
  calculateWaterVolume,
  calculateGasEnergy,
  calculateSteamEnergyLoss,
  calculatePressureFromSteam,
} from "../../utils/boilerCalculations"
import { getWaterDensity, getWaterSpecificHeat, getSteamData } from "../../utils/steamTable"
import BoilerState from "./BoilerTypes"
import { CstSimulation, CstPhysics } from "../const"
const { CstBoiler } = CstSimulation
function BoilerTick(boilerState: BoilerState): BoilerState {
  let newWaterVolume = boilerState.waterVolume
  let energyChange = 0
  let removedSteamMass = 0
  let steamRemovalEnergyLoss = 0

  // Handle filling and draining
  if (boilerState.fillValveOpen) {
    const fillAmount = CstBoiler.TotalVolume * CstBoiler.FillingRate * CstSimulation.DeltaTime
    newWaterVolume = Math.min(CstBoiler.TotalVolume, newWaterVolume + fillAmount)

    // Adding water doesn't change total energy, just adds mass
    // The temperature will naturally decrease as the same energy is distributed
    // over a larger mass of water
  }

  if (boilerState.drainValveOpen) {
    const drainAmount = CstBoiler.TotalVolume * CstBoiler.DrainingRate * CstSimulation.DeltaTime

    // Calculate the ratio of water being drained
    const originalVolume = boilerState.waterVolume
    newWaterVolume = Math.max(0, newWaterVolume - drainAmount)

    if (originalVolume > 0) {
      // Temperature doesn't change when draining (assuming uniform temperature)
      // But total energy is reduced proportionally
      const drainRatio = drainAmount / originalVolume
      // Remove the same proportion of energy
      energyChange -= boilerState.energy * drainRatio
    }
  }

  // --- Steam Mass Calculation (Early for Volume Adjustment) ---
  // Get temperature-dependent water density
  const waterDensity =
    boilerState.temperature < 80 ? CstPhysics.Water_Density : getWaterDensity(boilerState.temperature)

  // Calculate water mass using density
  const waterMassBeforeSteam = (newWaterVolume * waterDensity) / 1000

  // Calculate instantaneous steam rate
  const instantaneousSteamRate = calculateSteamGeneration(
    waterMassBeforeSteam, // Use current mass estimate for rate calculation
    boilerState.temperature,
    boilerState.pressure,
  )

  // Steam generated in this tick (kg)
  const generatedSteamMass = instantaneousSteamRate * CstSimulation.DeltaTime

  // Calculate the volume of liquid water lost to steam (Liters)
  // Use the calculateWaterVolume function to get the correct volume based on temperature
  const waterVolumePerKg = calculateWaterVolume(1, boilerState.temperature) // Volume of 1kg of water at current temperature
  const liquidVolumeDecreaseLiters = generatedSteamMass * waterVolumePerKg

  // Adjust water volume *before* final mass calculation
  newWaterVolume = Math.max(0, newWaterVolume - liquidVolumeDecreaseLiters)
  // --- End Steam Mass Calculation (Early Part) ---

  // Water mass (kg) - Now calculated based on adjusted volume and temperature-dependent density
  const waterMass = (newWaterVolume * waterDensity) / 1000

  // Add energy from gas
  const gasEnergy = calculateGasEnergy(boilerState.gasFlow) * CstSimulation.DeltaTime
  energyChange += gasEnergy

  // Natural cooling - use temperature-dependent specific heat
  const specificHeat = getWaterSpecificHeat(boilerState.temperature)
  const coolingEnergyLoss = waterMass * specificHeat * CstBoiler.CoolingRate * CstSimulation.DeltaTime
  energyChange -= coolingEnergyLoss

  // Calculate steam generation (Use the already calculated instantaneous rate)
  // const steamRate = calculateSteamGeneration(waterMass, state.temperature, state.pressure) // Already calculated above
  const steamEnergyLoss =
    calculateSteamEnergyLoss(instantaneousSteamRate, boilerState.temperature) * CstSimulation.DeltaTime
  energyChange -= steamEnergyLoss

  // Update total energy
  const newEnergy = Math.max(0, boilerState.energy + energyChange)

  // --- Steam Removal Calculation ---

  // Only attempt to remove steam if there's steam and the valve is open
  if (boilerState.bypassValvePosition > 0 && boilerState.steamMass > 0) {
    const steamRemovalRate = (boilerState.bypassValvePosition / 100) * CstBoiler.MaxSteamRemovalRate
    removedSteamMass = Math.min(boilerState.steamMass, steamRemovalRate * CstSimulation.DeltaTime)

    // Calculate energy loss from steam removal
    // Steam carries both sensible heat (temperature) and latent heat
    const steamData = getSteamData(boilerState.temperature)
    const steamEnthalpy = steamData.enthalpy + steamData.latentHeat // Total enthalpy (kJ/kg)
    steamRemovalEnergyLoss = removedSteamMass * steamEnthalpy

    // Add this to the energy change calculation
    energyChange -= steamRemovalEnergyLoss
  }
  // --- End Steam Removal Calculation ---

  // --- Steam Mass Accumulation ---
  // Accumulate steam mass (using generatedSteamMass calculated earlier and accounting for removed steam)
  const newSteamMass = Math.max(0, boilerState.steamMass + generatedSteamMass - removedSteamMass)
  // --- End Steam Mass Accumulation ---

  // Calculate new temperature based on energy changes

  let newTemperature

  if (waterMass <= 0) {
    newTemperature = boilerState.temperature
  } else {
    // For temperature changes, consider only gas heating, cooling, and steam generation
    // When water amount changes (filling/draining), the temperature shouldn't be directly affected

    // Energy changes not related to water volume changes
    const nonVolumeEnergyChange = gasEnergy - coolingEnergyLoss - steamEnergyLoss

    // Calculate temperature change from these energy changes - use temperature-dependent specific heat
    const tempDelta = waterMass > 0 ? nonVolumeEnergyChange / (waterMass * specificHeat) : 0

    // Apply the temperature change to current temperature
    const calculatedTemp = boilerState.temperature + tempDelta

    // Apply reasonable limits (minimum temperature is 20°C - room temperature)
    newTemperature = Math.max(20, calculatedTemp)
  }

  // Calculate new pressure based on steam mass, temperature, and available volume
  let newPressure

  // Fixed atmospheric pressure for reference
  const atmosphericPressure = CstPhysics.AtmosphericPressure

  // If there is no steam, keep pressure at atmospheric (1 bar)
  if (newSteamMass < 0.001) {
    newPressure = atmosphericPressure
  } else {
    // For temperatures at or above 100°C, calculate pressure based on steam accumulation
    // Get saturation pressure from steam table
    const steamData = getSteamData(newTemperature)
    const saturationPressure = steamData.pressure

    // Calculate volume occupied by liquid water
    const liquidWaterVolume = newWaterVolume

    // Calculate volume available for steam
    const availableVolumeForSteam = Math.max(0, CstBoiler.TotalVolume - liquidWaterVolume)

    // Calculate pressure based on steam mass, temperature, and available volume
    const calculatedPressure = calculatePressureFromSteam(
      newSteamMass,
      newTemperature,
      availableVolumeForSteam,
      saturationPressure,
    )

    // Ensure pressure is at least atmospheric
    newPressure = Math.max(atmosphericPressure, calculatedPressure)
  }

  // steam flow out via the Bypass Valve - only if Main Steam valve is open
  const newBypassOutFlow = !boilerState.mainSteamValve
    ? 0
    : newSteamMass > 0.1
      ? (boilerState.bypassValvePosition / 100) * CstBoiler.MaxSteamRemovalRate
      : 0
  // steam flow out via the Turbine Valve  - only if Main Steam valve is open
  // can only take the steam that's isn't already taken by the Bypass
  const maxTurbineFlow = newSteamMass - newBypassOutFlow
  const newTurbineOutFlow = !boilerState.mainSteamValve
    ? 0
    : maxTurbineFlow > 0.1
      ? (boilerState.turbineValvePosition / 100) * CstBoiler.MaxSteamRemovalRate
      : 0

  return {
    ...boilerState,
    waterVolume: newWaterVolume,
    temperature: newTemperature,
    pressure: newPressure,
    steamMass: newSteamMass, // Store updated steam mass with higher precision
    energy: newEnergy,
    energyDelta: energyChange / CstSimulation.DeltaTime,
    bypassSteamFlowOut: newBypassOutFlow,
    turbineSteamFlowOut: newTurbineOutFlow,
    deltaWaterVolume: newWaterVolume - boilerState.waterVolume,
  }
}

export default BoilerTick
