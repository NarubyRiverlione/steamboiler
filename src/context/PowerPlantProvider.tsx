import { ReactNode, useReducer, useEffect } from "react"
import BoilerState, { BoilerAction } from "./Boiler/BoilerTypes.ts"
import boilerReducer, { initialBoilerState } from "./Boiler/BoilerReducer"
import CondenserState, { CondenserAction } from "./Condenser/CondenserTypes.ts"
import condenserReducer, { initialCondenserState } from "./Condenser/CondenserReducer.ts"
import TurbineState, { TurbineAction } from "./Turbine/TurbineTypes.ts"
import turbineReducer, { initialTurbineState } from "./Turbine/TurbineReducer.ts"
import { CstSimulation } from "./const.ts"
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
  const [turbineState, turbineDispatch] = useReducer(turbineReducer, initialTurbineState) as [
    TurbineState,
    (action: TurbineAction) => void,
  ]

  // Simulation loop
  useEffect(() => {
    const simulationInterval = setInterval(() => {
      //#region Condenser
      const { pressure: boilerPressure, steamMass: previousSteamMass } = boilerState

      const steamFromBypass = { temp: boilerState.temperature, flow: boilerState.bypassSteamFlowOut }
      const steamFromTurbine = { temp: boilerState.temperature, flow: boilerState.turbineSteamFlowOut }
      condenserDispatch({
        type: "SIMULATE_TICK",
        payload: { boilerPressure, steamFromBypass, steamFromTurbine },
      })
      // remove steam from bypass valve in the boiler
      //  boilerRemoveSteam(boilerState.bypassValvePosition, "BYPASS")
      // add condensation water to the boiler
      // boilerAddCondensationWater(condenserState.returnRate)
      boilerDispatch({
        type: "ADD_CONDENSATION_WATER",
        payload: { condensationFlow: condenserState.returnRate },
      })
      //#endregion
      //#region Turbine
      turbineDispatch({
        type: "SIMULATE_TICK",
        payload: { turbineValvePosition: boilerState.turbineValvePosition },
      })
      // remove steam from turbine valve in the boiler
      boilerRemoveSteam(boilerState.turbineValvePosition, "TURBINE")
      //#endregion
      //#region Boiler
      boilerDispatch({ type: "SIMULATE_TICK", payload: { previousSteamMass } })

      //#endregion
    }, CstSimulation.DeltaTime * 1000) // DeltaTime is in sec

    return () => {
      clearInterval(simulationInterval)
    }
  }, [boilerState, condenserState, condenserDispatch])

  //#region  Boiler action creators
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
  const adjustBypassValve = (amount: number) => {
    boilerDispatch({ type: "ADJUST_STEAM_BYPASS_VALVE", amount })
  }
  const toggleMainSteamValve = () => {
    boilerDispatch({ type: "TOGGLE_MAIN_STEAM_VALVE" })
  }
  const adjustTurbineValve = (amount: number) => {
    boilerDispatch({ type: "ADJUST_STEAM_TURBINE_VALVE", amount })
  }
  const boilerAddCondensationWater = (condensationFlow: number) => {
    boilerDispatch({ type: "ADD_CONDENSATION_WATER", payload: { condensationFlow } })
  }
  const boilerRemoveSteam = (amount: number, removeBy: "BYPASS" | "TURBINE" | "VENT") => {
    boilerDispatch({ type: "REMOVE_STEAM", payload: { removeSteam: amount, removeBy } })
  }
  //#endregion

  //#region Condenser action creators
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
  //#endregion

  return (
    <PowerPlantContext.Provider
      value={{
        // boiler reducer
        boilerState,
        boilerDispatch,
        // condenser reducer
        condenserState,
        condenserDispatch,
        // turbine reducer (added)
        turbineState,
        turbineDispatch,
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
