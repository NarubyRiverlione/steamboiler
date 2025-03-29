import { ReactNode, useReducer, useEffect } from "react"
import BoilerState, { BoilerAction } from "./Boiler/BoilerTypes.ts"
import boilerReducer, { initialBoilerState } from "./Boiler/BoilerReducer"
import CondenserState, { CondenserAction } from "./Condenser/CondenserTypes.ts"
import condenserReducer, { initialCondenserState } from "./Condenser/CondenserReducer.ts"
import { simulateCondenserVacuum } from "./Condenser/CondenserTick"
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

      // Simulate boiler
      boilerDispatch({ type: "SIMULATE_TICK", deltaTime })
      
      // Simulate condenser vacuum
      // Calculate steam flow from boiler to condenser
      const steamFlow = boilerState.mainSteamValvePosition > 0 && boilerState.steamMass > 0
        ? (boilerState.mainSteamValvePosition / 100) * CstSimulation.MaxSteamRemovalRate
        : 0;
      
      // Get condenser vacuum actions
      const condenserActions = simulateCondenserVacuum(condenserState, steamFlow, deltaTime);
      
      // Dispatch all condenser actions
      condenserActions.forEach(action => {
        condenserDispatch(action);
      });
      
    }, 100) // Update 10 times per second

    return () => {
      clearInterval(simulationInterval)
    }
  }, [boilerState.mainSteamValvePosition, boilerState.steamMass, condenserState, condenserDispatch])

  // Boiler action creators
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

  // Condenser action creators
  const toggleAirExtractionPump = () => {
    condenserDispatch({ 
      type: "SET_AIR_EXTRACTION_PUMP_ENABLED", 
      payload: !condenserState.isAirExtractionPumpEnabled 
    })
  }

  const toggleSjae = () => {
    condenserDispatch({ 
      type: "SET_SJAE_ENABLED", 
      payload: !condenserState.isSjaeEnabled 
    })
  }

  const adjustSjaeValvePosition = (amount: number) => {
    const newPosition = Math.max(0, Math.min(100, condenserState.sjaeValvePosition + amount))
    condenserDispatch({ 
      type: "SET_SJAE_VALVE_POSITION", 
      payload: newPosition 
    })
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
        toggleAirExtractionPump,
        toggleSjae,
        adjustSjaeValvePosition,
      }}
    >
      {children}
    </PowerPlantContext.Provider>
  )
}
export default PowerPlantProvider
