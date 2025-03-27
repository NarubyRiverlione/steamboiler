import { createContext, useContext } from "react"
import { getSteamData } from "../utils/steamTable"
import { CstPhysics, CstSimulation } from "./const"
import BoilerState from "./BoilerTypes"

export type BoilerContextType = {
  state: BoilerState
  increaseGasFlow: (amount: number) => void
  decreaseGasFlow: (amount: number) => void
  toggleFillValve: () => void
  toggleDrainValve: () => void
}

// Initial state
export const initialState: BoilerState = {
  waterVolume: CstSimulation.StartWaterVolume, // 50% filled
  temperature: CstSimulation.StartTemperature, // Celsius
  pressure: 1, // bar (atmospheric pressure)
  gasFlow: 0, // No gas flow initially
  steamRate: 0, // No steam generation initially
  fillValveOpen: false,
  drainValveOpen: false,
  energy: (50 * CstPhysics.Water_Density * getSteamData(CstSimulation.StartTemperature).enthalpy) / 1000, // Initial energy based on water volume and temperature
  energyDelta: 0,
  steamRateHistory: [],
  steamMass: 0, // Initially no steam mass
}

// Context
export const BoilerContext = createContext<BoilerContextType | undefined>(undefined)

// Hook
function useBoiler() {
  const context = useContext(BoilerContext)

  if (context === undefined) {
    throw new Error("useBoiler must be used within a BoilerProvider")
  }

  return context
}

export default useBoiler
