import { createContext, useContext } from "react"
import BoilerState, { BoilerAction } from "./Boiler/BoilerTypes"
import CondenserState, { CondenserAction } from "./Condenser/CondenserTypes"

export type PowerPlantContextType = {
  boilerState: BoilerState
  boilerDispatch: (action: BoilerAction) => void

  condenserState: CondenserState
  condenserDispatch: (action: CondenserAction) => void

  // Boiler action creators
  increaseGasFlow: (amount: number) => void
  decreaseGasFlow: (amount: number) => void
  toggleFillValve: () => void
  toggleDrainValve: () => void
  adjustMainSteamValve: (amount: number) => void
  
  // Condenser action creators
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
