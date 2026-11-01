import { makeInitialState } from "../../src/context/PowerPlantReducer"
import PowerPlantAction from "../../src/context/PowerPlantActions"
import PowerPlantState from "../../src/context/PowerPlantState"
import { Scenario } from "../scenario"
import { holdPressureWithGas, PressureHoldSettings } from "./pressure-hold"
import { holdBoilerLevel, holdCondensing, holdHotwell } from "./loop-operator"
import { heatUp, isAdjustTime, openMainSteam } from "./steps"

// Cold start in two phases (GLOSSARY.md, "Pressure hold"):
// 1. Build pressure: the shared timed steps heat from 20°C, pull the vacuum, open the main steam valve and crack the
//    turbine valve to 5%, so less steam leaves than is generated and pressure rises.
// 2. Pressure hold: when boiler pressure first enters the 165 ± 2 bar band, `startupOperator` opens the turbine valve
//    once to a fixed load opening, and gas becomes the throttle. Hold mode stays off and the breaker open (see #18).

export const StartupSettings = {
  TurbineLoadOpening: 0.091, // turbine valve position at the pressure hold: 18.2 kg/s, steam × pressure = 3003, so ~3000 rpm at 165 bar
  AdjustEvery: 1, // sim-seconds between gas and level adjustments
}

const S = StartupSettings
const Tolerance = 1e-9 // float noise on valve positions

// Once pressure is in the band the turbine valve goes from its crack to the load opening, a delta, once
function openToLoad({ Boiler, Turbine }: PowerPlantState): PowerPlantAction[] {
  const inBand = Boiler.pressure >= PressureHoldSettings.Target - PressureHoldSettings.Band
  const delta = S.TurbineLoadOpening - Turbine.turbineValvePosition
  const cracked = Turbine.turbineValvePosition > 0
  if (!Turbine.mainSteamValve || !inBand || !cracked || delta < Tolerance) return []
  return [{ type: "ADJUST_STEAM_TURBINE_VALVE", payload: { turbineValvePosition: delta } }]
}

// The hold phase has begun once the turbine valve has been opened to its load opening
const holding = ({ Turbine }: PowerPlantState): boolean => Turbine.turbineValvePosition >= S.TurbineLoadOpening - Tolerance

// With 18 kg/s leaving, the boiler level and hotwell need the loop operator's holds, or the boiler runs dry (docs/plant/feedwater-loop.md)
function holdLoop(state: PowerPlantState, time: number): PowerPlantAction[] {
  const adjustNow = isAdjustTime(time, S.AdjustEvery)
  return [
    ...holdHotwell(state),
    ...(adjustNow ? [...holdPressureWithGas(state), ...holdBoilerLevel(state), ...holdCondensing(state)] : []),
  ]
}

export function startupOperator(state: PowerPlantState, time: number): PowerPlantAction[] {
  if (!state.Turbine.mainSteamValve) return []
  return [...openToLoad(state), ...(holding(state) ? holdLoop(state, time) : [])]
}

export const startupCold: Scenario = {
  name: "startup-cold",
  description: "Heat from 20°C, open main steam valve, crack turbine valve to build pressure, then gas holds 165 bar with the turbine valve at its load opening",
  duration: 14000,
  sampleEvery: 10,
  initial: makeInitialState(),
  actions: [...heatUp, ...openMainSteam],
  operator: startupOperator,
}
