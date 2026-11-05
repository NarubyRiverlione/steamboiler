import { ScenarioAction } from "../scenario"

// Operator steps shared by scenarios; a scenario that continues from a settled plant loads a snapshot instead (sim/snapshot-sources.ts).

export const StartGas = 2000 // liters/second during heat-up

// Main steam valve time: ~13.7 bar by now (saturation pressure of the heated water, #12; the water is held as kg since #34, so its full heat capacity slows the heat-up); the reducer refuses below 10 bar
export const AtPressure = 780

// t=0: gas on, air extraction pump on. The SJAE waits for main-steam-valve pressure (below it, it switches itself off).
export const heatUp: ScenarioAction[] = [
  { at: 0, action: { type: "INCREASE_GAS_FLOW", amount: StartGas } },
  {
    at: 0,
    action: { type: "SET_AIR_EXTRACTION_PUMP_ENABLED", payload: { isAirExtractionPumpEnabled: true } },
  },
]

// At pressure: open the main steam valve and hold the vacuum (SJAE on and open, recirculation pump
// open so the exhaust condenses, condensation pump open so the condensate returns to the boiler),
// then crack the bypass valve to build pressure (the turbine valve stays shut: a cracked turbine valve would spin the
// rotor past MaxRPM before Ramp up could start, ADR 0021). The air extraction pump has pulled the condenser under
// the vacuum limit by now (ADR 0003).
export const openMainSteam: ScenarioAction[] = [
  { at: AtPressure, action: { type: "TOGGLE_MAIN_STEAM_VALVE" } },
  { at: AtPressure, action: { type: "SET_SJAE_ENABLED", payload: { isSjaeEnabled: true } } },
  { at: AtPressure, action: { type: "SET_SJAE_VALVE_POSITION", payload: { sjaeValvePosition: 1 } } },
  {
    at: AtPressure,
    action: { type: "SET_RECIRCULATION_PUMP_VALVE_POSITION", payload: { recirculationPumpValvePosition: 1 } },
  },
  {
    at: AtPressure,
    action: { type: "SET_CONDENSATION_PUMP_VALVE_POSITION", payload: { condensationPumpValvePosition: 0.05 } },
  },
  {
    at: AtPressure + 10,
    action: { type: "ADJUST_STEAM_BYPASS_VALVE", payload: { bypassValvePosition: 0.05 } },
  },
]

// True on the ticks that fall on a whole multiple of `every` sim-seconds: an operator's adjustment moments
export const isAdjustTime = (time: number, every: number): boolean =>
  Number.isInteger(Math.round(time * 1e6) / 1e6 / every)
