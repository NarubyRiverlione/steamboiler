import { createContext, useContext } from "react"
import { getSteamData } from "../utils/steamTable"
import { CstPhysics, CstSimulation } from "./const"

// Types
export type BoilerState = {
  waterVolume: number // liters
  temperature: number // Celsius
  pressure: number // bar
  gasFlow: number // liters/second
  steamRate: number // kg/second
  fillValveOpen: boolean
  drainValveOpen: boolean
  energy: number // kJ
  energyDelta: number // kJ/s
}

type BoilerContextType = {
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
  pressure: 0.946, // bar (atmospheric pressure at 98°C)
  gasFlow: 0, // No gas flow initially
  steamRate: 0, // No steam generation initially
  fillValveOpen: false,
  drainValveOpen: false,
  energy: (50 * CstPhysics.Water_Density * getSteamData(CstSimulation.StartTemperature).enthalpy) / 1000, // Initial energy based on water volume and temperature
  energyDelta: 0,
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
