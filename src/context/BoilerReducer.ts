import {
  calculateGasEnergy,
  calculateSteamEnergyLoss,
  calculateSteamGeneration,
  calculateWaterVolume,
  calculatePressureFromSteam,
} from "../utils/boilerCalculations"
import { getSteamData, getWaterDensity, getWaterSpecificHeat } from "../utils/steamTable"
import BoilerState, { BoilerAction } from "./BoilerTypes"
import { CstPhysics, CstSimulation } from "./const"

function boilerReducer(state: BoilerState, action: BoilerAction): BoilerState {
  switch (action.type) {
    case "INCREASE_GAS_FLOW":
      return {
        ...state,
        gasFlow: Math.min(CstSimulation.MaxGasFlow, state.gasFlow + action.amount), // Cap at 10 L/s
      }

    case "DECREASE_GAS_FLOW":
      return {
        ...state,
        gasFlow: Math.max(0, state.gasFlow - action.amount),
      }

    case "TOGGLE_FILL_VALVE":
      return {
        ...state,
        fillValveOpen: !state.fillValveOpen,
      }

    case "TOGGLE_DRAIN_VALVE":
      return {
        ...state,
        drainValveOpen: !state.drainValveOpen,
      }

    case "ADJUST_MAIN_STEAM_VALVE": {
      // Ensure the valve position stays within 0-100%
      const newPosition = Math.max(0, Math.min(100, state.mainSteamValvePosition + action.amount))

      return {
        ...state,
        mainSteamValvePosition: newPosition,
      }
    }

    case "SIMULATE_TICK": {
      const { deltaTime } = action
      let newWaterVolume = state.waterVolume
      let energyChange = 0
      let removedSteamMass = 0
      let steamRemovalEnergyLoss = 0

      // Handle filling and draining
      if (state.fillValveOpen) {
        const fillAmount = CstSimulation.BoilerTotalVolume * CstSimulation.FillingRate * deltaTime
        newWaterVolume = Math.min(CstSimulation.BoilerTotalVolume, newWaterVolume + fillAmount)

        // Adding water doesn't change total energy, just adds mass
        // The temperature will naturally decrease as the same energy is distributed
        // over a larger mass of water
      }

      if (state.drainValveOpen) {
        const drainAmount = CstSimulation.BoilerTotalVolume * CstSimulation.DrainingRate * deltaTime

        // Calculate the ratio of water being drained
        const originalVolume = state.waterVolume
        newWaterVolume = Math.max(0, newWaterVolume - drainAmount)

        if (originalVolume > 0) {
          // Temperature doesn't change when draining (assuming uniform temperature)
          // But total energy is reduced proportionally
          const drainRatio = drainAmount / originalVolume
          // Remove the same proportion of energy
          energyChange -= state.energy * drainRatio
        }
      }

      // --- Steam Mass Calculation (Early for Volume Adjustment) ---
      // Get temperature-dependent water density
      const waterDensity = state.temperature < 80 ? CstPhysics.Water_Density : getWaterDensity(state.temperature)

      // Calculate water mass using density
      const waterMassBeforeSteam = (newWaterVolume * waterDensity) / 1000

      // Calculate instantaneous steam rate
      const instantaneousSteamRate = calculateSteamGeneration(
        waterMassBeforeSteam, // Use current mass estimate for rate calculation
        state.temperature,
        state.pressure,
      )

      // Steam generated in this tick (kg)
      const generatedSteamMass = instantaneousSteamRate * deltaTime

      // Calculate the volume of liquid water lost to steam (Liters)
      // Use the calculateWaterVolume function to get the correct volume based on temperature
      const waterVolumePerKg = calculateWaterVolume(1, state.temperature) // Volume of 1kg of water at current temperature
      const liquidVolumeDecreaseLiters = generatedSteamMass * waterVolumePerKg

      // Adjust water volume *before* final mass calculation
      newWaterVolume = Math.max(0, newWaterVolume - liquidVolumeDecreaseLiters)
      // --- End Steam Mass Calculation (Early Part) ---

      // Water mass (kg) - Now calculated based on adjusted volume and temperature-dependent density
      const waterMass = (newWaterVolume * waterDensity) / 1000

      // Add energy from gas
      const gasEnergy = calculateGasEnergy(state.gasFlow) * deltaTime
      energyChange += gasEnergy

      // Natural cooling - use temperature-dependent specific heat
      const specificHeat = getWaterSpecificHeat(state.temperature)
      const coolingEnergyLoss = waterMass * specificHeat * CstSimulation.CoolingRate * deltaTime
      energyChange -= coolingEnergyLoss

      // Calculate steam generation (Use the already calculated instantaneous rate)
      // const steamRate = calculateSteamGeneration(waterMass, state.temperature, state.pressure) // Already calculated above
      const steamEnergyLoss = calculateSteamEnergyLoss(instantaneousSteamRate, state.temperature) * deltaTime
      energyChange -= steamEnergyLoss

      // Update total energy
      const newEnergy = Math.max(0, state.energy + energyChange)

      // --- Steam Rate Averaging Logic ---
      const now = Date.now()
      const tenSecondsAgo = now - 10000 // 10 seconds in milliseconds

      // Calculate instantaneous steam rate for history (already done above)
      // const instantaneousSteamRate = steamRate

      // Add new entry and filter old ones
      const updatedHistory = [...state.steamRateHistory, { timestamp: now, rate: instantaneousSteamRate }].filter(
        (entry) => entry.timestamp >= tenSecondsAgo,
      )

      // Calculate the average steam rate over the relevant history
      let averageSteamRate = 0
      if (updatedHistory.length > 0) {
        const sumOfRates = updatedHistory.reduce((sum, entry) => sum + entry.rate, 0)
        averageSteamRate = sumOfRates / updatedHistory.length
      }
      // --- End Steam Rate Averaging Logic ---

      // --- Steam Removal Calculation ---
      // Only attempt to remove steam if there's steam and the valve is open
      if (state.mainSteamValvePosition > 0 && state.steamMass > 0) {
        const steamRemovalRate = (state.mainSteamValvePosition / 100) * CstSimulation.MaxSteamRemovalRate
        removedSteamMass = Math.min(state.steamMass, steamRemovalRate * deltaTime)

        // Calculate energy loss from steam removal
        // Steam carries both sensible heat (temperature) and latent heat
        const steamData = getSteamData(state.temperature)
        const steamEnthalpy = steamData.enthalpy + steamData.latentHeat // Total enthalpy (kJ/kg)
        steamRemovalEnergyLoss = removedSteamMass * steamEnthalpy

        // Add this to the energy change calculation
        energyChange -= steamRemovalEnergyLoss
      }
      // --- End Steam Removal Calculation ---

      // --- Steam Mass Accumulation ---
      // Accumulate steam mass (using generatedSteamMass calculated earlier and accounting for removed steam)
      const newSteamMass = Math.max(0, state.steamMass + generatedSteamMass - removedSteamMass)
      // --- End Steam Mass Accumulation ---

      // Calculate new temperature based on energy changes

      let newTemperature

      if (waterMass <= 0) {
        newTemperature = state.temperature
      } else {
        // For temperature changes, consider only gas heating, cooling, and steam generation
        // When water amount changes (filling/draining), the temperature shouldn't be directly affected

        // Energy changes not related to water volume changes
        const nonVolumeEnergyChange = gasEnergy - coolingEnergyLoss - steamEnergyLoss

        // Calculate temperature change from these energy changes - use temperature-dependent specific heat
        const tempDelta = waterMass > 0 ? nonVolumeEnergyChange / (waterMass * specificHeat) : 0

        // Apply the temperature change to current temperature
        const calculatedTemp = state.temperature + tempDelta

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
        const availableVolumeForSteam = Math.max(0, CstSimulation.BoilerTotalVolume - liquidWaterVolume)

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

      // steam flow out via the Steam Master Valve
      const newSteamOutFlow =
        newSteamMass > 0.1 ? (state.mainSteamValvePosition / 100) * CstSimulation.MaxSteamRemovalRate * 1000 : 0

      return {
        ...state,
        waterVolume: Number(newWaterVolume.toFixed(1)),
        temperature: Number(newTemperature.toFixed(1)),
        pressure: Number(newPressure.toFixed(1)),
        steamRate: Number(averageSteamRate.toFixed(1)), // Use the calculated average
        steamRateHistory: updatedHistory, // Store the updated history
        steamMass: Number(newSteamMass.toFixed(6)), // Store updated steam mass with higher precision
        energy: Number(newEnergy.toFixed(1)),
        energyDelta: Number((energyChange / deltaTime).toFixed(1)),
        steamFlowOut: Number(newSteamOutFlow.toFixed(1)),
      }
    }

    default:
      return state
  }
}

export default boilerReducer
