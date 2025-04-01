import { ReactNode, useReducer, useEffect } from "react"
import BoilerState, { BoilerAction } from "./Boiler/BoilerTypes.ts"
import boilerReducer, { initialBoilerState } from "./Boiler/BoilerReducer"
import CondenserState, { CondenserAction } from "./Condenser/CondenserTypes.ts"
import condenserReducer, { initialCondenserState } from "./Condenser/CondenserReducer.ts"
import { PowerPlantContext } from "./PowerPlantContext.tsx"
import { CstSimulation } from "./const.ts"

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

  // Simulation loop
  useEffect(() => {
    const simulationInterval = setInterval(() => {
      //  boiler
      boilerDispatch({ type: "SIMULATE_TICK" })

      // condenser vacuum
      const { steamFlowOut } = boilerState
      condenserDispatch({ type: "SIMULATE_TICK", payload: { boilerSteamFlow: steamFlowOut } })

      // add condensation water to the boiler
      boilerDispatch({ type: "ADD_CONDENSATION_WATER", amount: condenserState.returnRate })
    }, CstSimulation.DeltaTime * 1000) // delta in ms

    return () => {
      clearInterval(simulationInterval)
    }
  }, [boilerState, condenserState, condenserDispatch])

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
      payload: { isAirExtractionPumpEnabled: !condenserState.isAirExtractionPumpEnabled },
    })
  }
  const toggleSjae = () => {
    condenserDispatch({
      type: "SET_SJAE_ENABLED",
      payload: { isSjaeEnabled: !condenserState.isSjaeEnabled },
    })
  }
  const adjustSjaeValvePosition = (amount: number) => {
    const sjaeValvePosition = Math.max(0, Math.min(100, condenserState.sjaeValvePosition + amount))
    condenserDispatch({
      type: "SET_SJAE_VALVE_POSITION",
      payload: { sjaeValvePosition },
    })
  }
  const adjustRecirculationPumpValvePosition = (amount: number) => {
    const recirculationPumpValvePosition = Math.max(
      0,
      Math.min(1, condenserState.recirculationPumpValvePosition + amount / 100),
    )
    condenserDispatch({
      type: "SET_RECIRCULATION_PUMP_VALVE_POSITION",
      payload: { recirculationPumpValvePosition },
    })
  }
  const adjustCondensationPumpValvePosition = (amount: number) => {
    const condensationPumpValvePosition = Math.max(
      0,
      Math.min(1, condenserState.condensationPumpValvePosition + amount / 100),
    )
    condenserDispatch({
      type: "SET_CONDENSATION_PUMP_VALVE_POSITION",
      payload: { condensationPumpValvePosition },
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
        adjustRecirculationPumpValvePosition,
        adjustCondensationPumpValvePosition,
      }}
    >
      {children}
    </PowerPlantContext.Provider>
  )
}
export default PowerPlantProvider
