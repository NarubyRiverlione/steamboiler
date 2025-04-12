import { ReactNode, useReducer, useEffect } from "react"
import { CstSimulation } from "./const.ts"
import { PowerPlantContext } from "./PowerPlantContext.tsx"
import { initialPowerPlantState, powerPlantReducer } from "./PowerPlantReducer.ts"

// Provider
function PowerPlantProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(powerPlantReducer, initialPowerPlantState)

  // Simulation loop
  useEffect(() => {
    const simulationInterval = setInterval(() => {
      dispatch({ type: "SIMULATE_TICK" })
    }, CstSimulation.DeltaTime * 1000) // DeltaTime is in sec

    return () => {
      clearInterval(simulationInterval)
    }
  }, [state, dispatch])

  //#region  Boiler action creators
  const increaseGasFlow = (amount: number) => {
    dispatch({ type: "INCREASE_GAS_FLOW", amount })
  }
  const decreaseGasFlow = (amount: number) => {
    dispatch({ type: "DECREASE_GAS_FLOW", amount })
  }
  const toggleFillValve = () => {
    dispatch({ type: "TOGGLE_FILL_VALVE" })
  }
  const toggleDrainValve = () => {
    dispatch({ type: "TOGGLE_DRAIN_VALVE" })
  }
  const adjustBypassValve = (position: number) => {
    dispatch({ type: "ADJUST_STEAM_BYPASS_VALVE", payload: { bypassValvePosition: position } })
  }
  const toggleMainSteamValve = () => {
    dispatch({ type: "TOGGLE_MAIN_STEAM_VALVE" })
  }
  const adjustTurbineValve = (position: number) => {
    dispatch({ type: "ADJUST_STEAM_TURBINE_VALVE", payload: { turbineValvePosition: position } })
  }
  //#endregion

  //#region Condenser action creators
  const toggleAirExtractionPump = () => {
    dispatch({
      type: "SET_AIR_EXTRACTION_PUMP_ENABLED",
      payload: { isAirExtractionPumpEnabled: !state.Condenser.isAirExtractionPumpEnabled },
    })
  }
  const toggleSjae = () => {
    dispatch({
      type: "SET_SJAE_ENABLED",
      payload: { isSjaeEnabled: !state.Condenser.isSjaeEnabled },
    })
  }
  const adjustSjaeValvePosition = (position: number) => {
    dispatch({
      type: "SET_SJAE_VALVE_POSITION",
      payload: { sjaeValvePosition: position },
    })
  }
  const adjustRecirculationPumpValvePosition = (position: number) => {
    dispatch({
      type: "SET_RECIRCULATION_PUMP_VALVE_POSITION",
      payload: { recirculationPumpValvePosition: position },
    })
  }
  const adjustCondensationPumpValvePosition = (position: number) => {
    dispatch({
      type: "SET_CONDENSATION_PUMP_VALVE_POSITION",
      payload: { condensationPumpValvePosition: position },
    })
  }
  //#endregion

  return (
    <PowerPlantContext.Provider
      value={{
        state,
        dispatch,
        // boiler actions
        increaseGasFlow,
        decreaseGasFlow,
        toggleFillValve,
        toggleDrainValve,
        adjustBypassValve,
        toggleMainSteamValve,
        adjustTurbineValve,
        // condenser actions
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
