import { CondenserTick } from "./Condenser/CondenserTick"
import TurbineTick, { MainSteamValveLowPressureClosure } from "./Turbine/TurbineTick"
import BoilerTick, { BoilerBurnerTrip, BoilerRemoveSteam, BoilerVent } from "./Boiler/BoilerTick"

import PowerPlantState, { BoilerState, CondenserState, HeaterState, TurbineState } from "./PowerPlantState"
import { CstSimulation } from "./const"
import { roomInKg } from "../utils/boilerCalculations"
import { getExhaustEnthalpy, getSaturationEnthalpies } from "../utils/steamTable"
import { shaftWorkFraction } from "../utils/turbineCalculations"
import { calculateExtraction, Extraction, mixReturn } from "../utils/extractionHeater"

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
    state.Heater.extractionFlow,
  )

  // remove steam via turbine valve
  const turbineResult = BoilerRemoveSteam(bypassResult.boilerState, bypassResult.turbineState, "TURBINE")

  // Condenser: receives the steam removed from the boiler in this same tick
  const boilerPressure: number = bypassResult.boilerState.pressure

  // Extraction heater (ADR 0031): the steam it takes follows from the heat the Return takes, and leaves the turbine before
  // the condenser. The Return is last tick's (the condenser runs after the exhaust is known), a lag of one tick.
  const extraction: Extraction = calculateExtraction({
    turbineFlow: turbineResult.turbineState.turbineSteamFlowOut,
    workFraction: shaftWorkFraction(state.Turbine.rpm),
    boilerPressure,
    returnFlow: state.Condenser.returnRate / CstSimulation.DeltaTime,
    returnTemperature: state.Condenser.hotwellTemperature,
  })
  // Bypass steam is saturated vapour at the boiler pressure
  const steamFromBypass: { flow: number; enthalpy: number } = {
    flow: turbineResult.turbineState.bypassSteamFlowOut,
    enthalpy: getSaturationEnthalpies(boilerPressure).vapor,
  }
  // Exhaust enthalpy at the same pressures as the enthalpy drop in TurbineTick, less the work the shaft takes at its
  // speed: at standstill the exhaust is the inlet steam
  const steamFromTurbine: { flow: number; enthalpy: number } = {
    flow: turbineResult.turbineState.turbineSteamFlowOut - extraction.flow,
    enthalpy: getExhaustEnthalpy(
      boilerPressure,
      state.Condenser.pressure / 1000,
      CstSimulation.CstTurbine.IsentropicEfficiency,
      shaftWorkFraction(state.Turbine.rpm),
    ),
  }
  // The return fills the boiler at most to its total volume (kg at the boiler temperature); steam and drain only lower
  // it afterwards
  // The heater drain joins the Return, so it takes room in the boiler first
  const boilerRoom: number = Math.max(
    0,
    roomInKg(CstSimulation.CstBoiler.TotalVolume, state.Boiler.waterVolume, state.Boiler.temperature) -
      extraction.flow * CstSimulation.DeltaTime,
  )
  const condenserNewState: CondenserState = CondenserTick(
    state.Condenser,
    state.Boiler.pressure,
    steamFromBypass,
    steamFromTurbine,
    boilerRoom,
  )

  // The heater drain is pumped forward into the Return: this tick's Return and the extraction steam, condensed, together
  const heated = mixReturn(
    condenserNewState.returnRate,
    condenserNewState.hotwellTemperature,
    extraction.flow * CstSimulation.DeltaTime,
    extraction,
  )

  // Boiler
  // add this tick's return, drain included, before recalculating the boiler state
  const boilerRemovedSteam: BoilerState = {
    ...turbineResult.boilerState,
    waterMass: turbineResult.boilerState.waterMass + heated.mass,
  }

  // The economizer heats this tick's Return with the flue gas; the Return arrives from the heater
  const boilerNewState: BoilerState = BoilerTick(boilerRemovedSteam, {
    flow: heated.mass / CstSimulation.DeltaTime,
    temperature: heated.temperature,
  })

  const heaterNewState: HeaterState = {
    extractionFlow: extraction.flow,
    tapPressure: extraction.tapPressure,
    heaterPressure: extraction.heaterPressure,
    returnTemperature: heated.temperature,
  }
  
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
    Heater: heaterNewState,
    Turbine: updatedTurbineState,
  }
}
