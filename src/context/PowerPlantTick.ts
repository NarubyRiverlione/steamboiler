import { CondenserTick } from "./Condenser/CondenserTick"
import TurbineTick from "./Turbine/TurbineTick"
import BoilerTick, { BoilerRemoveSteam } from "./Boiler/BoilerTick"

import PowerPlantState, { BoilerState, CondenserState, TurbineState } from "./PowerPlantState"
import { CstSimulation } from "./const"

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
