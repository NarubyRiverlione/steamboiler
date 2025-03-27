import { calculateGasEnergy, calculateSteamEnergyLoss, calculateSteamGeneration } from "../utils/boilerCalculations"
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

    case "SIMULATE_TICK": {
      const { deltaTime } = action
      let newWaterVolume = state.waterVolume
      let energyChange = 0

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
      
      // Calculate instantaneous steam rate (needed before waterMass calculation)
      const instantaneousSteamRate = calculateSteamGeneration(
        (newWaterVolume * waterDensity) / 1000, // Use current volume estimate for rate calc with temperature-dependent density
        state.temperature,
        state.pressure
      )
      // Steam generated in this tick (kg)
      const generatedSteamMass = instantaneousSteamRate * deltaTime
      // Calculate the volume of liquid water lost to steam (Liters)
      const liquidVolumeDecreaseLiters = (generatedSteamMass / waterDensity) * 1000
      // Adjust water volume *before* final mass calculation
      newWaterVolume = Math.max(0, newWaterVolume - liquidVolumeDecreaseLiters)
      // --- End Steam Mass Calculation (Early Part) ---

      // Water mass (kg) - Now calculated based on adjusted volume and temperature-dependent density
      // waterDensity is already calculated above
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
      const updatedHistory = [
        ...state.steamRateHistory,
        { timestamp: now, rate: instantaneousSteamRate },
      ].filter((entry) => entry.timestamp >= tenSecondsAgo)

      // Calculate the average steam rate over the relevant history
      let averageSteamRate = 0
      if (updatedHistory.length > 0) {
        const sumOfRates = updatedHistory.reduce((sum, entry) => sum + entry.rate, 0)
        averageSteamRate = sumOfRates / updatedHistory.length
      }
      // --- End Steam Rate Averaging Logic ---

      // --- Steam Mass Accumulation ---
      // Accumulate steam mass (using generatedSteamMass calculated earlier)
      const newSteamMass = state.steamMass + generatedSteamMass
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

      // Calculate new pressure
      // Below 100°C: Pressure is based on the steam table (vapor pressure)
      // Above 100°C: Pressure continues to rise with temperature
      let newPressure
      const steamData = getSteamData(newTemperature)

      // Fixed atmospheric pressure for reference
      const atmosphericPressure = CstPhysics.AtmosphericPressure

      // If temperature is at or above 100°C (boiling at atmospheric pressure)
      // then pressure should be at least atmospheric
      if (newTemperature >= 100) {
        newPressure = Math.max(atmosphericPressure, steamData.pressure)
      } else {
        // Below 100°C, use vapor pressure from steam table
        newPressure = steamData.pressure
      }

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
      }
    }

    default:
      return state
  }
}

export default boilerReducer
