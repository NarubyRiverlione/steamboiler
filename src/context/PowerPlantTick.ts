import { CondenserTick } from "./Condenser/CondenserTick"
import TurbineTick, { MainSteamValveLowPressureClosure } from "./Turbine/TurbineTick"
import BoilerTick, { BoilerBurnerTrip, BoilerRemoveSteam, BoilerVent } from "./Boiler/BoilerTick"

import PowerPlantState, { BoilerState, CondenserState, TurbineState } from "./PowerPlantState"
import { CstSimulation } from "./const"
import { roomInKg } from "../utils/boilerCalculations"
import { getExhaustEnthalpy, getSaturationEnthalpies } from "../utils/steamTable"
import { shaftWorkFraction } from "../utils/turbineCalculations"

export default function PowerPlantTick(state: PowerPlantState): PowerPlantState {
  // The relief valve vents to the atmosphere first, upstream of the main steam valve; that steam leaves the loop
  const ventedBoiler = BoilerVent(BoilerBurnerTrip(state.Boiler))

  // The main steam valve closes on low pressure before any steam leaves through it (ADR 0026)
  const turbineAfterClosure: TurbineState = MainSteamValveLowPressureClosure(state.Turbine, state.Boiler.pressure)

  // remove steam via bypass valve
  const bypassResult = BoilerRemoveSteam(ventedBoiler, turbineAfterClosure, "BYPASS")

  // Turbine
  const turbineNewState: TurbineState = TurbineTick(
    bypassResult.turbineState,
    bypassResult.boilerState.pressure,
    state.Condenser.pressure,
  )

  // remove steam via turbine valve
  const turbineResult = BoilerRemoveSteam(bypassResult.boilerState, bypassResult.turbineState, "TURBINE")

  // Condenser: receives the steam removed from the boiler in this same tick
  const boilerPressure: number = bypassResult.boilerState.pressure
  // Bypass steam is saturated vapour at the boiler pressure
  const steamFromBypass: { flow: number; enthalpy: number } = {
    flow: turbineResult.turbineState.bypassSteamFlowOut,
    enthalpy: getSaturationEnthalpies(boilerPressure).vapor,
  }
  // Exhaust enthalpy at the same pressures as the enthalpy drop in TurbineTick, less the work the shaft takes at its
  // speed: at standstill the exhaust is the inlet steam
  const steamFromTurbine: { flow: number; enthalpy: number } = {
    flow: turbineResult.turbineState.turbineSteamFlowOut,
    enthalpy: getExhaustEnthalpy(
      boilerPressure,
      state.Condenser.pressure / 1000,
      CstSimulation.CstTurbine.IsentropicEfficiency,
      shaftWorkFraction(state.Turbine.rpm),
    ),
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
  
  // The economizer heats this tick's Return with the flue gas; the Return enters the boiler at the hotwell temperature
  const boilerNewState: BoilerState = BoilerTick(boilerRemovedSteam, {
    flow: condenserNewState.returnRate / CstSimulation.DeltaTime,
    temperature: condenserNewState.hotwellTemperature,
  })
  
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
