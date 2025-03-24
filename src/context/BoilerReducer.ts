import { calculateGasEnergy, calculateSteamEnergyLoss, calculateSteamGeneration } from "../utils/boilerCalculations"
import { getSteamData } from "../utils/steamTable"
import { BoilerAction } from "./BoilerActions"
import { BoilerState } from "./BoilerContext"
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

      // Water mass (kg)
      const waterMass = (newWaterVolume * CstPhysics.Water_Density) / 1000

      // Add energy from gas
      const gasEnergy = calculateGasEnergy(state.gasFlow) * deltaTime
      energyChange += gasEnergy

      // Natural cooling
      const coolingEnergyLoss = waterMass * CstPhysics.Water_SpecificHeat * CstSimulation.CoolingRate * deltaTime
      energyChange -= coolingEnergyLoss

      // Calculate steam generation
      const steamRate = calculateSteamGeneration(waterMass, state.temperature, state.pressure)
      const steamEnergyLoss = calculateSteamEnergyLoss(steamRate, state.temperature) * deltaTime
      energyChange -= steamEnergyLoss

      // Update total energy
      const newEnergy = Math.max(0, state.energy + energyChange)

      // Calculate new temperature based on energy changes

      let newTemperature

      if (waterMass <= 0) {
        newTemperature = state.temperature
      } else {
        // For temperature changes, consider only gas heating, cooling, and steam generation
        // When water amount changes (filling/draining), the temperature shouldn't be directly affected

        // Energy changes not related to water volume changes
        const nonVolumeEnergyChange = gasEnergy - coolingEnergyLoss - steamEnergyLoss

        // Calculate temperature change from these energy changes
        const tempDelta = waterMass > 0 ? nonVolumeEnergyChange / (waterMass * CstPhysics.Water_SpecificHeat) : 0

        // Apply the temperature change to current temperature
        const calculatedTemp = state.temperature + tempDelta

        // Apply reasonable limits (minimum temperature is 20°C - room temperature)
        newTemperature = Math.max(20, calculatedTemp)
      }

      // Calculate new pressure
      // Below 100°C: Pressure is based on the steam table (vapor pressure)
      // Above 100°C: Pressure continues to rise with temperature
      let newPressure;
      const steamData = getSteamData(newTemperature);
      
      // Fixed atmospheric pressure for reference
      const atmosphericPressure = CstPhysics.AtmosphericPressure;
      
      // If temperature is at or above 100°C (boiling at atmospheric pressure)
      // then pressure should be at least atmospheric
      if (newTemperature >= 100) {
        newPressure = Math.max(atmosphericPressure, steamData.pressure);
      } else {
        // Below 100°C, use vapor pressure from steam table
        newPressure = steamData.pressure;
      }

      return {
        ...state,
        waterVolume: Number(newWaterVolume.toFixed(1)),
        temperature: Number(newTemperature.toFixed(1)),
        pressure: Number(newPressure.toFixed(1)),
        steamRate: Number(steamRate.toFixed(1)),
        energy: Number(newEnergy.toFixed(1)),
        energyDelta: Number((energyChange / deltaTime).toFixed(1)),
      }
    }

    default:
      return state
  }
}

export default boilerReducer
