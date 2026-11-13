/**
 * Cold start in two phases (GLOSSARY.md, "Pressure hold", "Ramp up", ADR 0008, ADR 0021).
 * 1. Build pressure: the shared timed steps heat from 20°C, pull the vacuum, open the main steam valve and crack the
 *    bypass valve to 5%, so less steam leaves than is generated and pressure rises. The turbine valve stays shut.
 * 2. Pressure hold and run-up: once boiler pressure first enters the 165 ± 2 bar band, gas becomes the throttle and
 *    `startupOperator` takes Ramp up through the run-up points 500, 1500, 2500 and 3000 rpm, moving on as soon as Hold
 *    engages at a point. The run ends in Hold at 3000 rpm after a settling time, the breaker still open (see #18).
 */
import { CstSimulation } from "../../src/context/const"
import { makeInitialState } from "../../src/context/PowerPlantReducer"
import PowerPlantAction from "../../src/context/PowerPlantActions"
import PowerPlantState from "../../src/context/PowerPlantState"
import { Scenario } from "../scenario"
import { holdHeatUpLevel, holdLoop } from "./loop-operator"
import { atWorkingPressure } from "./pressure-hold"
import { steerHeatingRate } from "./heat-up"
import { airPumpOn, openMainSteamActions, startUpVent } from "./steps"

const { RunUpPoints } = CstSimulation.CstTurbine

export const StartupSettings = {
  SettlingTime: 600, // sim-seconds in Hold at sync speed before the run ends: the same window turbine-sync judges
  Duration: 29800, // sim-seconds: the heat-up at the limit to working pressure (~22 000 s, #103), the recovery of the bypass crack to ~25 000 s, the run-up (60 min at the run-up rate, Hold at 3000 rpm from ~28 600 s) and the settling time
}

// At working pressure: from Free, select the first point above the speed and start Ramp up; in Hold at a point
// below sync speed, select the next point, which starts Ramp up again from the current speed
function runUp({ Boiler, Turbine }: PowerPlantState): PowerPlantAction[] {
  if (!Turbine.mainSteamValve || !atWorkingPressure(Boiler.pressure)) return []
  const { speedMode, runUpPoint, rpm } = Turbine
  if (speedMode === "rampUp") return []
  const next: number | undefined = RunUpPoints.find((point) => point > (speedMode === "hold" ? runUpPoint : rpm))
  if (next === undefined) return []
  const select: PowerPlantAction = { type: "SELECT_RUN_UP_POINT", payload: { runUpPoint: next } }
  return speedMode === "hold" ? [select] : [select, { type: "SET_SPEED_MODE", payload: { speedMode: "rampUp" } }]
}

// Below working pressure the gas follows the heating rate, the real cold start (#103): the main steam valve opens at
// working pressure (ADR 0018) and the bypass is cracked, and the gas keeps following the rate while a pressure dip from
// the steam draw is recovered.
// In the band the loop operator's holds keep the boiler from running dry (docs/plant/feedwater-loop.md); the valve
// opens only at working pressure, so the boiler level hold runs from the moment steam flows (ADR 0018)
export function startupOperator(state: PowerPlantState, time: number): PowerPlantAction[] {
  const { Boiler, Turbine } = state
  const vent: PowerPlantAction[] = startUpVent(state, time)
  const heating: PowerPlantAction[] = atWorkingPressure(Boiler.pressure) ? [] : steerHeatingRate(Boiler, time)
  if (!Turbine.mainSteamValve) {
    const open: PowerPlantAction[] = atWorkingPressure(Boiler.pressure) ? openMainSteamActions : []
    return [...vent, ...open, ...holdHeatUpLevel(state), ...heating]
  }
  const holds: PowerPlantAction[] = holdLoop(state, time)
  const holdsWithoutGas: PowerPlantAction[] = atWorkingPressure(Boiler.pressure)
    ? holds
    : holds.filter((a) => a.type !== "SET_GAS_RATE")
  return [...vent, ...runUp(state), ...holdsWithoutGas, ...heating]
}

export const turbineRunup: Scenario = {
  name: "turbine-runup",
  description: "Heat from 20°C, open main steam valve, build pressure on the bypass, then Ramp up through 500, 1500, 2500 and 3000 rpm to Hold at sync speed",
  duration: StartupSettings.Duration,
  sampleEvery: 10,
  initial: makeInitialState(),
  actions: [airPumpOn],
  operator: startupOperator,
}
