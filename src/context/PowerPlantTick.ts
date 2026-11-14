import { CondenserTick } from "./Condenser/CondenserTick"
import TurbineTick, { MainSteamValveLowPressureClosure, TurbineTripWhenOpen } from "./Turbine/TurbineTick"
import BoilerTick, { BoilerBurnerTrip, BoilerLevelHighTrip, BoilerRemoveSteam, BoilerVent, isAtBoilerHighHigh } from "./Boiler/BoilerTick"

import { DeaeratorResult, DeaeratorTick } from "./Deaerator/DeaeratorTick"
import PowerPlantState, { BoilerState, CondenserState, DeaeratorState, HeaterState, TurbineState } from "./PowerPlantState"
import { CstDeaerator, CstSimulation } from "./const"
import { sprayFlowOf } from "./Boiler/Attemperator"
import { roomInKg } from "../utils/boilerCalculations"
import { getExhaustEnthalpy, getInletEnthalpy, getLiquidEnthalpy } from "../utils/steamTable"
import { shaftWorkFraction } from "../utils/turbineCalculations"
import { calculateExtraction, drainEnthalpyOf, Extraction, heatFeedwater } from "../utils/extractionHeater"

export default function PowerPlantTick(state: PowerPlantState): PowerPlantState {
  // The relief valve vents to the atmosphere first, upstream of the main steam valve; that steam leaves the loop
  const ventedBoiler = BoilerVent(BoilerLevelHighTrip(BoilerBurnerTrip(state.Boiler)))

  // The high-high level (ADR 0041) trips the turbine and shuts the feed pump valve before anything is delivered this tick
  const levelHighHigh: boolean = isAtBoilerHighHigh(state.Boiler)

  // The main steam valve closes on low pressure before any steam leaves through it (ADR 0026)
  const turbineAfterLowPressure: TurbineState = MainSteamValveLowPressureClosure(state.Turbine, state.Boiler.pressure)
  const turbineAfterClosure: TurbineState = levelHighHigh ? TurbineTripWhenOpen(turbineAfterLowPressure) : turbineAfterLowPressure

  // remove steam via bypass valve
  const bypassResult = BoilerRemoveSteam(ventedBoiler, turbineAfterClosure, "BYPASS")

  // Turbine
  const turbineNewState: TurbineState = TurbineTick(
    bypassResult.turbineState,
    bypassResult.boilerState.pressure,
    state.Condenser.pressure,
    state.Heater.extractionFlow + state.Deaerator.extractionFlow,
    state.Boiler.steamTemperature,
  )

  // remove steam via turbine valve
  const drumResult = BoilerRemoveSteam(bypassResult.boilerState, bypassResult.turbineState, "TURBINE")

  // Attemperator (ADR 0044): the spray water joins all the steam that left the drum, between the superheater stages. It comes
  // from the feed pump discharge, so it cannot exceed what the pump delivered in the last tick, and the steam flows below
  // (turbine, bypass, extraction, condenser) count it. The boiler is fed the rest of the pump outflow.
  const drumFlow: number = drumResult.turbineState.turbineSteamFlowOut + drumResult.turbineState.bypassSteamFlowOut
  const sprayFlow: number =
    drumFlow > 0 ? Math.min(sprayFlowOf(state.Boiler.sprayValvePosition), state.Deaerator.outflowMass / CstSimulation.DeltaTime) : 0
  const sprayShare: number = drumFlow > 0 ? 1 + sprayFlow / drumFlow : 1
  const turbineResult = {
    boilerState: drumResult.boilerState,
    turbineState: {
      ...drumResult.turbineState,
      turbineSteamFlowOut: drumResult.turbineState.turbineSteamFlowOut * sprayShare,
      bypassSteamFlowOut: drumResult.turbineState.bypassSteamFlowOut * sprayShare,
    },
  }
  const steamTemperature: number = state.Boiler.steamTemperature

  // Condenser: receives the steam removed from the boiler in this same tick
  const boilerPressure: number = bypassResult.boilerState.pressure

  // Extraction heater (ADR 0031): the steam it takes follows from the heat the feedwater takes, and leaves the turbine
  // before the condenser. The feedwater is last tick's outflow of the deaerator, a lag of one tick.
  const extraction: Extraction = calculateExtraction({
    turbineFlow: turbineResult.turbineState.turbineSteamFlowOut,
    workFraction: shaftWorkFraction(state.Turbine.rpm),
    boilerPressure,
    steamTemperature,
    returnFlow: state.Deaerator.outflowMass / CstSimulation.DeltaTime - state.Boiler.sprayFlow,
    returnTemperature: state.Deaerator.temperature,
  })

  // Deaerator tap (ADR 0036): the non-return valve passes steam in proportion to the pressure margin of the heater line at
  // the tap over the setpoint (nothing at or below it, so no backflow), and only what the turbine has left after the
  // heater. It follows the demand of the last tick. Air raises the vessel pressure above the setpoint, and the tap
  // cannot push steam into a vessel above its own pressure.
  const tapBackPressure: number = Math.max(CstDeaerator.Pressure, state.Deaerator.pressure)
  const tapOpening: number = Math.min(
    1,
    Math.max(0, (extraction.heaterPressure - tapBackPressure) / (tapBackPressure * CstDeaerator.ExtractionOpeningRange)),
  )
  const tapFlow: number = Math.min(
    state.Deaerator.tapDemand,
    CstDeaerator.ExtractionValveCapacity * tapOpening,
    Math.max(0, turbineResult.turbineState.turbineSteamFlowOut - extraction.flow),
  )

  // Bypass steam leaves at the steam temperature, with no bypass spray (ADR 0032, ADR 0044)
  const steamFromBypass: { flow: number; enthalpy: number } = {
    flow: turbineResult.turbineState.bypassSteamFlowOut,
    enthalpy: getInletEnthalpy(boilerPressure, steamTemperature),
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
      steamTemperature,
    ),
  }
  // The condensation pump stops short of a full deaerator: the room (at the vessel temperature) less the steam and the heater
  // drain that join the water in the same tick (the let-down steam of the last tick)
  const deaeratorRoom: number = Math.max(
    0,
    roomInKg(CstDeaerator.TotalVolume, state.Deaerator.waterVolume, state.Deaerator.temperature) -
      (extraction.flow + tapFlow + state.Deaerator.letDownFlow) * CstSimulation.DeltaTime,
  )
  const condenserNewState: CondenserState = CondenserTick(
    state.Condenser,
    state.Boiler.pressure,
    steamFromBypass,
    steamFromTurbine,
    deaeratorRoom,
  )

  // Deaerator: takes this tick's Return and the heater drain, holds 3 bar with the tap steam and the let-down valve, and the
  // feed pump delivers its outflow to the boiler
  const deaerator: DeaeratorResult = DeaeratorTick(levelHighHigh ? { ...state.Deaerator, feedPumpValvePosition: 0 } : state.Deaerator, {
    intake: { mass: condenserNewState.returnRate, temperature: condenserNewState.hotwellTemperature },
    drain: { mass: extraction.flow * CstSimulation.DeltaTime, enthalpy: drainEnthalpyOf(extraction.heaterPressure) },
    tapSteam: { mass: tapFlow * CstSimulation.DeltaTime, enthalpy: extraction.tapEnthalpy },
    boiler: {
      pressure: boilerPressure,
      steamMass: turbineResult.boilerState.steamMass,
      lowLevel: ventedBoiler.burnerTripped, // the low-low trip latches, so the valve does not chatter at the level
    },
    // The feed pump stops short of a full boiler (ADR 0004)
    boilerRoom: roomInKg(CstSimulation.CstBoiler.TotalVolume, state.Boiler.waterVolume, state.Boiler.temperature),
  })
  const deaeratorNewState: DeaeratorState = deaerator.state

  // The spray water left the pump discharge before the heater, so the heater heats the rest of the outflow
  const sprayMass: number = sprayFlow * CstSimulation.DeltaTime
  const feedMass: number = deaerator.outflow.mass - sprayMass

  // The heater heats the deaerator outflow; its drain went back into the deaerator
  const feedwaterTemperature: number = heatFeedwater(
    feedMass,
    deaerator.outflow.temperature,
    extraction.flow * CstSimulation.DeltaTime,
    extraction,
  )

  // Boiler
  // the let-down steam leaves the boiler and comes back as water in the outflow, which joins before the boiler state is recalculated
  const boilerRemovedSteam: BoilerState = {
    ...turbineResult.boilerState,
    steamMass: turbineResult.boilerState.steamMass - deaerator.letDownMass,
    waterMass: turbineResult.boilerState.waterMass + feedMass,
  }

  // The economizer heats the feedwater with the flue gas; it arrives from the heater
  const boilerTicked: BoilerState = BoilerTick(
    boilerRemovedSteam,
    { flow: Math.max(0, feedMass) / CstSimulation.DeltaTime, temperature: feedwaterTemperature },
    { flow: drumFlow, sprayFlow, sprayEnthalpy: getLiquidEnthalpy(deaerator.outflow.temperature) },
  )
  // The net change over the tick against the previous state: the feed inflow joined before BoilerTick, so it would cancel out (#121)
  const boilerNewState: BoilerState = {
    ...boilerTicked,
    deltaWaterMass: boilerTicked.waterMass - state.Boiler.waterMass,
  }

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
