import { CondenserTick } from "./Condenser/CondenserTick"
import TurbineTick from "./Turbine/TurbineTick"
import BoilerTick, { BoilerRemoveSteam } from "./Boiler/BoilerTick"

import PowerPlantState, { BoilerState, CondenserState, TurbineState } from "./PowerPlantState"
import { CstSimulation } from "./const"

/*
  //#region Condenser
      const { pressure: boilerPressure, steamMass: previousSteamMass } = boilerState

      const steamFromBypass = { temp: boilerState.temperature, flow: boilerState.bypassSteamFlowOut }
      const steamFromTurbine = { temp: boilerState.temperature, flow: boilerState.turbineSteamFlowOut }
      powerPlantDispatch({
        type: "SIMULATE_TICK",
        payload: { boilerPressure, steamFromBypass, steamFromTurbine },
      })
      // remove steam from bypass valve in the boiler
      //  boilerRemoveSteam(boilerState.bypassValvePosition, "BYPASS")
      // add condensation water to the boiler
      // boilerAddCondensationWater(condenserState.returnRate)
      powerPlantDispatch({
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
      powerPlantDispatch({ type: "SIMULATE_TICK", payload: { previousSteamMass } })
*/

export default function PowerPlantTick(state: PowerPlantState): PowerPlantState {
  // Condenser
  const steamFromBypass = { temp: state.Boiler.temperature, flow: state.Boiler.bypassSteamFlowOut }
  // TODO use acutely the temp&pressure from spend steam of  the turbine
  const steamFromTurbine = {
    temp: CstSimulation.CstTurbine.steamOutflowTemperature,
    flow: state.Boiler.turbineSteamFlowOut,
    pressure: CstSimulation.CstTurbine.steamOutflowPressure,
  }
  const condenserNewState: CondenserState = CondenserTick(
    state.Condenser,
    state.Boiler.pressure,
    steamFromBypass,
    steamFromTurbine,
  )

  // remove steam via bypass valve
  const boilerBypassSteamRemoved: BoilerState = BoilerRemoveSteam(state.Boiler, "BYPASS")
  // Turbine
  const turbineNewState: TurbineState = TurbineTick(state.Turbine, state.Boiler.turbineValvePosition)
  // remove steam via turbine valve
  const boilerTurbineSteamRemoved: BoilerState = BoilerRemoveSteam(boilerBypassSteamRemoved, "TURBINE")
  // Boiler
  // add condensation water before recalculating the boiler state
  const boilerRemovedSteam: BoilerState = {
    ...boilerTurbineSteamRemoved,
    waterVolume: state.Boiler.waterVolume + state.Condenser.returnRate,
  }
  const boilerNewState: BoilerState = BoilerTick(boilerRemovedSteam)
  return {
    ...state,
    Boiler: boilerNewState,
    Condenser: condenserNewState,
    Turbine: turbineNewState,
  }
}
