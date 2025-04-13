import { Dispatch, createContext, useContext } from "react"
import PowerPlantState from "./PowerPlantState"
import PowerPlantAction from "./PowerPlantActions"

type PowerPlantContextType = {
  state: PowerPlantState
  dispatch: Dispatch<PowerPlantAction>
  // Action creators
  increaseGasFlow: (amount: number) => void
  decreaseGasFlow: (amount: number) => void
  toggleFillValve: () => void
  toggleDrainValve: () => void
  // Turbine RPM Control
  adjustBypassValve: (amount: number) => void
  toggleMainSteamValve: () => void
  adjustTurbineValve: (amount: number) => void
  adjustRPMSetPoint: (amount: number) => void
  toggleHoldMode: () => void
  // Condenser
  toggleAirExtractionPump: () => void
  toggleSjae: () => void
  adjustSjaeValvePosition: (amount: number) => void
  adjustRecirculationPumpValvePosition: (amount: number) => void
  adjustCondensationPumpValvePosition: (amount: number) => void
}

// Context
export const PowerPlantContext = createContext<PowerPlantContextType | undefined>(undefined)

// Hook
function usePowerPlant() {
  const context = useContext(PowerPlantContext)

  if (context === undefined) {
    throw new Error("usePowerPlant must be used within a PowerPlantProvider")
  }

  return context
}

export default usePowerPlant
