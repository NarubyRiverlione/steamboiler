import { CondenserTick } from "./Condenser/CondenserTick"
import TurbineTick from "./Turbine/TurbineTick"
import BoilerTick, { BoilerRemoveSteam, BoilerVent } from "./Boiler/BoilerTick"

import PowerPlantState, { BoilerState, CondenserState, TurbineState } from "./PowerPlantState"
import { CstSimulation } from "./const"
import { roomInKg } from "../utils/boilerCalculations"

export default function PowerPlantTick(state: PowerPlantState): PowerPlantState {
  // The relief valve vents to the atmosphere first, upstream of the main steam valve; that steam leaves the loop
  const ventedBoiler = BoilerVent(state.Boiler)

  // remove steam via bypass valve
  const bypassResult = BoilerRemoveSteam(ventedBoiler, state.Turbine, "BYPASS")

  // Turbine
  const turbineNewState: TurbineState = TurbineTick(
    bypassResult.turbineState,
    bypassResult.turbineState.turbineValvePosition,
    bypassResult.boilerState.pressure,
  )

  // remove steam via turbine valve
  const turbineResult = BoilerRemoveSteam(bypassResult.boilerState, bypassResult.turbineState, "TURBINE")

  // Condenser: receives the steam removed from the boiler in this same tick
  const steamFromBypass = { temp: state.Boiler.temperature, flow: turbineResult.turbineState.bypassSteamFlowOut }
  // TODO use acutely the temp&pressure from spend steam of  the turbine
  const steamFromTurbine = {
    temp: CstSimulation.CstTurbine.steamOutflowTemperature,
    flow: turbineResult.turbineState.turbineSteamFlowOut,
    pressure: CstSimulation.CstTurbine.steamOutflowPressure,
  }
  // The return fills the boiler at most to its total volume (kg at the boiler temperature); steam and drain only lower
  // it afterwards
  const boilerRoom: number = roomInKg(
    CstSimulation.CstBoiler.TotalVolume,
    state.Boiler.waterVolume,
    state.Boiler.temperature,
  )
  const condenserNewState: CondenserState = CondenserTick(
    state.Condenser,
    state.Boiler.pressure,
    steamFromBypass,
    steamFromTurbine,
    boilerRoom,
  )

  // Boiler
  // add this tick's return before recalculating the boiler state
  const boilerRemovedSteam: BoilerState = {
    ...turbineResult.boilerState,
    waterMass: turbineResult.boilerState.waterMass + condenserNewState.returnRate,
  }
  
  const boilerNewState: BoilerState = BoilerTick(boilerRemovedSteam)
  
  // Update turbine state with the new flow values
  const updatedTurbineState: TurbineState = {
    ...turbineNewState,
    bypassSteamFlowOut: turbineResult.turbineState.bypassSteamFlowOut,
    turbineSteamFlowOut: turbineResult.turbineState.turbineSteamFlowOut,
  }
  
  return {
    ...state,
    Boiler: boilerNewState,
    Condenser: condenserNewState,
    Turbine: updatedTurbineState,
  }
}
