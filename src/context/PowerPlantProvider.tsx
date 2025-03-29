import { ReactNode, useReducer, useEffect } from "react"
import BoilerState, { BoilerAction } from "./Boiler/BoilerTypes.ts"
import boilerReducer, { initialBoilerState } from "./Boiler/BoilerReducer"
import CondenserState, { CondenserAction } from "./Condenser/CondenserTypes.ts"
import condenserReducer, { initialCondenserState } from "./Condenser/CondenserReducer.ts"
import { CstSimulation } from "./const"
import { PowerPlantContext } from "./PowerPlantContext.tsx"

// Provider
function PowerPlantProvider({ children }: { children: ReactNode }) {
  const [boilerState, boilerDispatch] = useReducer(boilerReducer, initialBoilerState) as [
    BoilerState,
    (action: BoilerAction) => void,
  ]
  const [condenserState, condenserDispatch] = useReducer(condenserReducer, initialCondenserState) as [
    CondenserState,
    (action: CondenserAction) => void,
  ]

  useEffect(() => {
    if (boilerState.mainSteamValvePosition > 0 && boilerState.steamMass > 0) {
      const steamRemovalRate = (boilerState.mainSteamValvePosition / 100) * CstSimulation.MaxSteamRemovalRate
      const removedSteamMass = Math.min(boilerState.steamMass, steamRemovalRate * 0.1) // Assuming deltaTime is 0.1

      condenserDispatch({ type: "CONDENSE_STEAM", payload: removedSteamMass })
    }
  }, [boilerState.steamMass, boilerState.mainSteamValvePosition, condenserDispatch])

  // Simulation loop
  useEffect(() => {
    let lastTime = Date.now()

    const simulationInterval = setInterval(() => {
      const now = Date.now()
      const deltaTime = (now - lastTime) / 1000 // Convert to seconds
      lastTime = now

      boilerDispatch({ type: "SIMULATE_TICK", deltaTime })
    }, 100) // Update 10 times per second

    return () => {
      clearInterval(simulationInterval)
    }
  }, [])

  // Action creators
  const increaseGasFlow = (amount: number) => {
    boilerDispatch({ type: "INCREASE_GAS_FLOW", amount })
  }

  const decreaseGasFlow = (amount: number) => {
    boilerDispatch({ type: "DECREASE_GAS_FLOW", amount })
  }

  const toggleFillValve = () => {
    boilerDispatch({ type: "TOGGLE_FILL_VALVE" })
  }

  const toggleDrainValve = () => {
    boilerDispatch({ type: "TOGGLE_DRAIN_VALVE" })
  }

  const adjustMainSteamValve = (amount: number) => {
    boilerDispatch({ type: "ADJUST_MAIN_STEAM_VALVE", amount })
  }

  return (
    <PowerPlantContext.Provider
      value={{
        boilerState,
        boilerDispatch,
        condenserState,
        condenserDispatch,
        increaseGasFlow,
        decreaseGasFlow,
        toggleFillValve,
        toggleDrainValve,
        adjustMainSteamValve,
      }}
    >
      {children}
    </PowerPlantContext.Provider>
  )
}
export default PowerPlantProvider
