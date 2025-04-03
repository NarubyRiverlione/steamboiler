import { Dispatch, createContext, useContext } from "react"
import BoilerState, { BoilerAction } from "./Boiler/BoilerTypes"
import CondenserState, {CondenserAction } from "./Condenser/CondenserTypes"
import TurbineState, { TurbineAction } from "./Turbine/TurbineTypes"

export type PowerPlantContextType = {
  // Boiler reducer state and dispatch
  boilerState: BoilerState
  boilerDispatch: Dispatch<BoilerAction>
  // Condenser reducer state and dispatch
  condenserState: CondenserState
  condenserDispatch: Dispatch<CondenserAction>
  // Turbine reducer state and dispatch
  turbineState: TurbineState
  turbineDispatch: Dispatch<TurbineAction>
  // Action creators
  increaseGasFlow: (amount: number) => void
  decreaseGasFlow: (amount: number) => void
  toggleFillValve: () => void
  toggleDrainValve: () => void
  adjustBypassValve: (amount: number) => void
  toggleMainSteamValve: () => void
  adjustTurbineValve: (amount: number) => void
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
