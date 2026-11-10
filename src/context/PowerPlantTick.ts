import { CondenserTick } from "./Condenser/CondenserTick"
import TurbineTick, { MainSteamValveLowPressureClosure } from "./Turbine/TurbineTick"
import BoilerTick, { BoilerBurnerTrip, BoilerRemoveSteam, BoilerVent } from "./Boiler/BoilerTick"

import { DeaeratorResult, DeaeratorTick } from "./Deaerator/DeaeratorTick"
import PowerPlantState, { BoilerState, CondenserState, DeaeratorState, HeaterState, TurbineState } from "./PowerPlantState"
import { CstDeaerator, CstSimulation } from "./const"
import { roomInKg } from "../utils/boilerCalculations"
import { getExhaustEnthalpy, getSaturationEnthalpies } from "../utils/steamTable"
import { shaftWorkFraction } from "../utils/turbineCalculations"
import { calculateExtraction, drainEnthalpyOf, Extraction, heatFeedwater } from "../utils/extractionHeater"

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
    state.Heater.extractionFlow + state.Deaerator.extractionFlow,
  )

  // remove steam via turbine valve
  const turbineResult = BoilerRemoveSteam(bypassResult.boilerState, bypassResult.turbineState, "TURBINE")

  // Condenser: receives the steam removed from the boiler in this same tick
  const boilerPressure: number = bypassResult.boilerState.pressure

  // Extraction heater (ADR 0031): the steam it takes follows from the heat the feedwater takes, and leaves the turbine
  // before the condenser. The feedwater is last tick's outflow of the deaerator, a lag of one tick.
  const extraction: Extraction = calculateExtraction({
    turbineFlow: turbineResult.turbineState.turbineSteamFlowOut,
    workFraction: shaftWorkFraction(state.Turbine.rpm),
    boilerPressure,
    returnFlow: state.Deaerator.outflowMass / CstSimulation.DeltaTime,
    returnTemperature: state.Deaerator.temperature,
  })

  // Deaerator tap (ADR 0036): the non-return valve passes steam in proportion to the pressure margin of the heater line at
  // the tap over the setpoint (nothing at or below it, so no backflow), and only what the turbine has left after the
  // heater. It follows the demand of the last tick.
  const tapOpening: number = Math.min(
    1,
    Math.max(0, (extraction.heaterPressure - CstDeaerator.Pressure) / (CstDeaerator.Pressure * CstDeaerator.ExtractionOpeningRange)),
  )
  const tapFlow: number = Math.min(
    state.Deaerator.tapDemand,
    CstDeaerator.ExtractionValveCapacity * tapOpening,
    Math.max(0, turbineResult.turbineState.turbineSteamFlowOut - extraction.flow),
  )

  // Bypass steam is saturated vapour at the boiler pressure
  const steamFromBypass: { flow: number; enthalpy: number } = {
    flow: turbineResult.turbineState.bypassSteamFlowOut,
    enthalpy: getSaturationEnthalpies(boilerPressure).vapor,
  }
  // Exhaust enthalpy at the same pressures as the enthalpy drop in TurbineTick, less the work the shaft takes at its
  // speed: at standstill the exhaust is the inlet steam
  const steamFromTurbine: { flow: number; enthalpy: number } = {
    flow: turbineResult.turbineState.turbineSteamFlowOut - extraction.flow - tapFlow,
    enthalpy: getExhaustEnthalpy(
      boilerPressure,
      state.Condenser.pressure / 1000,
      CstSimulation.CstTurbine.IsentropicEfficiency,
      shaftWorkFraction(state.Turbine.rpm),
    ),
  }
  // The deaerator passes the Return on to the boiler in the same tick, with the steam that heated it and the heater drain
  // (until #112); that water takes room in the boiler first, so the pump stops short of a full boiler
  const boilerRoom: number = Math.max(
    0,
    roomInKg(CstSimulation.CstBoiler.TotalVolume, state.Boiler.waterVolume, state.Boiler.temperature) -
      (extraction.flow + tapFlow + state.Deaerator.letDownFlow) * CstSimulation.DeltaTime,
  )
  const condenserNewState: CondenserState = CondenserTick(
    state.Condenser,
    state.Boiler.pressure,
    steamFromBypass,
    steamFromTurbine,
    boilerRoom,
  )

  // Deaerator: takes this tick's Return and the heater drain, holds 3 bar with the tap steam and the let-down valve
  const deaerator: DeaeratorResult = DeaeratorTick(state.Deaerator, {
    intake: { mass: condenserNewState.returnRate, temperature: condenserNewState.hotwellTemperature },
    drain: { mass: extraction.flow * CstSimulation.DeltaTime, enthalpy: drainEnthalpyOf(extraction.heaterPressure) },
    tapSteam: { mass: tapFlow * CstSimulation.DeltaTime, enthalpy: extraction.tapEnthalpy },
    boiler: {
      pressure: boilerPressure,
      steamMass: turbineResult.boilerState.steamMass,
      lowLevel: ventedBoiler.burnerTripped, // the low-low trip latches, so the valve does not chatter at the level
    },
  })
  const deaeratorNewState: DeaeratorState = deaerator.state

  // The heater heats the deaerator outflow; its drain went back into the deaerator
  const feedwaterTemperature: number = heatFeedwater(
    deaerator.outflow.mass,
    deaerator.outflow.temperature,
    extraction.flow * CstSimulation.DeltaTime,
    extraction,
  )

  // Boiler
  // the let-down steam leaves the boiler and comes back as water in the outflow, which joins before the boiler state is recalculated
  const boilerRemovedSteam: BoilerState = {
    ...turbineResult.boilerState,
    steamMass: turbineResult.boilerState.steamMass - deaerator.letDownMass,
    waterMass: turbineResult.boilerState.waterMass + deaerator.outflow.mass,
  }

  // The economizer heats the feedwater with the flue gas; it arrives from the heater
  const boilerNewState: BoilerState = BoilerTick(boilerRemovedSteam, {
    flow: deaerator.outflow.mass / CstSimulation.DeltaTime,
    temperature: feedwaterTemperature,
  })

  const heaterNewState: HeaterState = {
    extractionFlow: extraction.flow,
    tapPressure: extraction.tapPressure,
    heaterPressure: extraction.heaterPressure,
    returnTemperature: feedwaterTemperature,
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
    Deaerator: deaeratorNewState,
    Heater: heaterNewState,
    Turbine: updatedTurbineState,
  }
}
