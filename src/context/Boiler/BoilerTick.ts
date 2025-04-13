import {
  calculateSteamGeneration,
  calculateWaterVolume,
  calculateGasEnergy,
  calculateSteamEnergyLoss,
  calculatePressureFromSteam,
} from "../../utils/boilerCalculations"
import { getWaterDensity, getWaterSpecificHeat, getSteamData } from "../../utils/steamTable"
import { CstSimulation, CstPhysics } from "../const"
import { BoilerState, TurbineState } from "../PowerPlantState"

const { CstBoiler, CstTurbine } = CstSimulation

function BoilerTick(boilerState: BoilerState): BoilerState {
  // console.log("5")
  let newWaterVolume = boilerState.waterVolume
  let energyChange = 0
  // let removedSteamMass = 0
  // let steamRemovalEnergyLoss = 0

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

  // Calculate instantaneous steam rate kg/s
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

  // --- End Steam Removal Calculation ---

  // --- Steam Mass Accumulation ---
  // Accumulate steam mass (using generatedSteamMass calculated earlier )
  const newSteamMass = Math.max(0, boilerState.steamMass + generatedSteamMass)
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

  // If there is no steam, keep pressure at atmospheric (1 bar)
  if (newSteamMass < 0.001) {
    newPressure = CstPhysics.AtmosphericPressure_mBar / 1e3
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
    newPressure = Math.max(CstPhysics.AtmosphericPressure_mBar / 1e3, calculatedPressure)
  }

  // average the values for a better UX
  return {
    ...boilerState,
    waterVolume: newWaterVolume,
    temperature: newTemperature,
    pressure: newPressure, //averageTwo(boilerState.pressure, newPressure),
    steamMass: newSteamMass, // averageTwo(boilerState.steamMass, newSteamMass),
    energy: newEnergy,
    energyDelta: energyChange / CstSimulation.DeltaTime, // averageTwo(boilerState.energyDelta, energyChange / CstSimulation.DeltaTime),
    // deltaWaterVolume: newWaterVolume - boilerState.waterVolume, // averageTwo(boilerState.deltaWaterVolume, newWaterVolume - boilerState.waterVolume),
    deltaSteamMass: generatedSteamMass / CstSimulation.DeltaTime, // Converted to kg/s
  }
}

// --- Steam Removal Calculation ---
export function BoilerRemoveSteam(
  boilerState: BoilerState,
  turbineState: TurbineState,
  removeBy: "BYPASS" | "TURBINE" | "VENT",
): { boilerState: BoilerState; turbineState: TurbineState } {
  // console.log("4")
  const {
    steamMass,
    waterVolume,
    temperature,
  } = boilerState
  
  const {
    mainSteamValve,
    bypassValvePosition,
    bypassSteamFlowOut,
    turbineValvePosition,
    turbineSteamFlowOut,
  } = turbineState
  
  const valvePosition =
    removeBy === "BYPASS" ? bypassValvePosition : removeBy === "TURBINE" ? turbineValvePosition : 0

  // Only attempt to remove steam if there's steam and the main steam valve is open
  if (!mainSteamValve || steamMass <= 0) {
    return { 
      boilerState, 
      turbineState: { 
        ...turbineState, 
        turbineSteamFlowOut: 0, 
        bypassSteamFlowOut: 0 
      } 
    }
  }

  const valveFlow = valvePosition * CstTurbine.MaxSteamRemovalRate
  const removedSteamMass = Math.min(steamMass, valveFlow)

  // Calculate new steam mass after removal
  const newSteamMass = steamMass - removedSteamMass * CstSimulation.DeltaTime
  // prevent negative steam mass
  if (newSteamMass < 0.001) {
    // newPressure = atmosphericPressure
    return {
      boilerState,
      turbineState: {
        ...turbineState,
        turbineSteamFlowOut: removeBy === "TURBINE" ? steamMass : turbineSteamFlowOut,
        bypassSteamFlowOut: removeBy === "BYPASS" ? steamMass : bypassSteamFlowOut,
      }
    }
  }
  // Recalculate boiler pressure after steam removal
  const steamData = getSteamData(temperature)
  const saturationPressure = steamData.pressure
  const availableVolumeForSteam = Math.max(0, CstBoiler.TotalVolume - waterVolume)
  const newPressure = Math.max(
    CstPhysics.AtmosphericPressure_mBar / 1000,
    calculatePressureFromSteam(newSteamMass, temperature, availableVolumeForSteam, saturationPressure),
  )

  return {
    boilerState: {
      ...boilerState,
      steamMass: newSteamMass,
      pressure: newPressure,
    },
    turbineState: {
      ...turbineState,
      turbineSteamFlowOut: removeBy === "TURBINE" ? removedSteamMass : turbineSteamFlowOut,
      bypassSteamFlowOut: removeBy === "BYPASS" ? removedSteamMass : bypassSteamFlowOut,
    }
  }
}

export default BoilerTick
