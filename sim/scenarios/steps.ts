import { ScenarioAction } from "../scenario"

// Operator steps shared by scenarios. A later scenario either replays the earlier steps or starts
// from a snapshot of them (see sim/snapshot-sources.ts) with its steps moved by `since`.

export const StartGas = 2000 // liters/second during heat-up

// Main steam valve time: ~13.7 bar by now (saturation pressure of the heated water, #12; the water is held as kg since #34, so its full heat capacity slows the heat-up); the reducer refuses below 10 bar
export const AtPressure = 780

// t=0: gas on, pull vacuum
export const heatUp: ScenarioAction[] = [
  { at: 0, action: { type: "INCREASE_GAS_FLOW", amount: StartGas } },
  {
    at: 0,
    action: { type: "SET_AIR_EXTRACTION_PUMP_ENABLED", payload: { isAirExtractionPumpEnabled: true } },
  },
  { at: 0, action: { type: "SET_SJAE_ENABLED", payload: { isSjaeEnabled: true } } },
]

// At pressure: open the main steam valve, crack the turbine valve
export const openMainSteam: ScenarioAction[] = [
  { at: AtPressure, action: { type: "TOGGLE_MAIN_STEAM_VALVE" } },
  {
    at: AtPressure + 10,
    action: { type: "ADJUST_STEAM_TURBINE_VALVE", payload: { turbineValvePosition: 0.05 } },
  },
]

// True on the ticks that fall on a whole multiple of `every` sim-seconds: an operator's adjustment moments
export const isAdjustTime = (time: number, every: number): boolean =>
  Number.isInteger(Math.round(time * 1e6) / 1e6 / every)

// The same steps timed from `start` instead of from the cold start, for a scenario starting from a snapshot taken at `start`
export const since = (start: number, actions: ScenarioAction[]): ScenarioAction[] =>
  actions.map((a) => ({ ...a, at: a.at - start }))

// Turbine valve to 25% so the turbine rolls
export const TurbineValveOpenAt = AtPressure + 20
export const rollTurbine: ScenarioAction[] = [
  {
    at: TurbineValveOpenAt,
    action: { type: "ADJUST_STEAM_TURBINE_VALVE", payload: { turbineValvePosition: 0.2 } },
  },
]
