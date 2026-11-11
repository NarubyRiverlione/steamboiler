import { Dispatch, createContext, useContext } from "react"
import PowerPlantState, { SpeedMode } from "./PowerPlantState"
import { PlaybackSpeed } from "./Playback"
import PowerPlantAction from "./PowerPlantActions"

type PowerPlantContextType = {
  state: PowerPlantState
  dispatch: Dispatch<PowerPlantAction>
  // Time control (outside the plant state)
  playbackSpeed: PlaybackSpeed
  simulatedSeconds: number
  setPlaybackSpeed: (speed: PlaybackSpeed) => void
  // Action creators
  setGasRate: (gasRateCommand: number) => void // the gas knob, -1 to 1
  toggleDrainValve: () => void
  // Turbine RPM Control
  adjustBypassValve: (amount: number) => void
  toggleMainSteamValve: () => void
  adjustTurbineValve: (amount: number) => void
  setSpeedMode: (speedMode: SpeedMode) => void
  selectRunUpPoint: (runUpPoint: number) => void
  toggleGeneratorBreaker: () => void
  setLoadSetpoint: (loadSetpoint: number) => void
  // Deaerator
  toggleDeaeratorVent: () => void
  adjustFeedPumpValvePosition: (amount: number) => void
  // Condenser
  toggleAirExtractionPump: () => void
  toggleSjae: () => void
  adjustSjaeValvePosition: (amount: number) => void
  adjustRecirculationPumpValvePosition: (amount: number) => void
  adjustCondensationPumpValvePosition: (amount: number) => void
  adjustMakeupValvePosition: (amount: number) => void
  adjustRejectValvePosition: (amount: number) => void
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
