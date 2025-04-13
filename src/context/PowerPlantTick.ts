import { CondenserTick } from "./Condenser/CondenserTick"
import TurbineTick from "./Turbine/TurbineTick"
import BoilerTick, { BoilerRemoveSteam } from "./Boiler/BoilerTick"

import PowerPlantState, { BoilerState, CondenserState, TurbineState } from "./PowerPlantState"
import { CstSimulation } from "./const"

export default function PowerPlantTick(state: PowerPlantState): PowerPlantState {
  // Condenser
  const steamFromBypass = { temp: state.Boiler.temperature, flow: state.Turbine.bypassSteamFlowOut }
  // TODO use acutely the temp&pressure from spend steam of  the turbine
  const steamFromTurbine = {
    temp: CstSimulation.CstTurbine.steamOutflowTemperature,
    flow: state.Turbine.turbineSteamFlowOut,
    pressure: CstSimulation.CstTurbine.steamOutflowPressure,
  }
  const condenserNewState: CondenserState = CondenserTick(
    state.Condenser,
    state.Boiler.pressure,
    steamFromBypass,
    steamFromTurbine,
  )

  // remove steam via bypass valve
  const bypassResult = BoilerRemoveSteam(state.Boiler, state.Turbine, "BYPASS")
  
  // Turbine
  const turbineNewState: TurbineState = TurbineTick(
    bypassResult.turbineState, 
    bypassResult.turbineState.turbineValvePosition
  )
  
  // remove steam via turbine valve
  const turbineResult = BoilerRemoveSteam(
    bypassResult.boilerState, 
    bypassResult.turbineState, 
    "TURBINE"
  )
  
  // Boiler
  // add condensation water before recalculating the boiler state
  const boilerRemovedSteam: BoilerState = {
    ...turbineResult.boilerState,
    waterVolume: turbineResult.boilerState.waterVolume + state.Condenser.returnRate,
  }
  
  const boilerNewState: BoilerState = BoilerTick(boilerRemovedSteam)
  const deltaWaterVolume = boilerNewState.waterVolume - state.Boiler.waterVolume
  
  // Update turbine state with the new flow values
  const updatedTurbineState: TurbineState = {
    ...turbineNewState,
    bypassSteamFlowOut: turbineResult.turbineState.bypassSteamFlowOut,
    turbineSteamFlowOut: turbineResult.turbineState.turbineSteamFlowOut,
  }
  
  return {
    ...state,
    Boiler: { ...boilerNewState, deltaWaterVolume },
    Condenser: condenserNewState,
    Turbine: updatedTurbineState,
  }
}
