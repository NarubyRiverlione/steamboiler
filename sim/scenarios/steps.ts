import PowerPlantAction from "../../src/context/PowerPlantActions"
import PowerPlantState from "../../src/context/PowerPlantState"
import { ScenarioAction } from "../scenario"
import { rampGas } from "./gas"

// Operator steps shared by scenarios; a scenario that continues from a settled plant loads a snapshot instead (sim/snapshot-sources.ts).

export const StartGas = 2000 // liters/second during heat-up

// Main steam valve time: ~34 bar by now (saturation pressure of the heated water, #12; the cold fill is 35%, ADR 0018); the reducer refuses below 10 bar
export const AtPressure = 780

// t=0: air extraction pump on. The SJAE waits for main-steam-valve pressure (below it, it switches itself off).
export const airPumpOn: ScenarioAction = {
  at: 0,
  action: { type: "SET_AIR_EXTRACTION_PUMP_ENABLED", payload: { isAirExtractionPumpEnabled: true } },
}

// t=0: gas up to the heat-up gas with one turn of the knob (about 7 s at full deflection), air extraction pump on.
export const heatUp: ScenarioAction[] = [...rampGas(0, 0, StartGas), airPumpOn]

// At pressure: open the main steam valve and hold the vacuum (SJAE on and open, recirculation pump
// open so the exhaust condenses, condensation pump and feed pump open so the condensate returns to the boiler),
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
    at: AtPressure,
    action: { type: "SET_FEED_PUMP_VALVE_POSITION", payload: { feedPumpValvePosition: 0.05 } },
  },
  {
    at: AtPressure + 10,
    action: { type: "ADJUST_STEAM_BYPASS_VALVE", payload: { bypassValvePosition: 0.05 } },
  },
]

// True on the ticks that fall on a whole multiple of `every` sim-seconds: an operator's adjustment moments
export const isAdjustTime = (time: number, every: number): boolean =>
  Number.isInteger(Math.round(time * 1e6) / 1e6 / every)

// The deaerator start-up vent as the operator works it (#120): opened at t=0 on a vessel full of air, closed once the
// safe-to-close lamp lights. A vessel without air (a snapshot) is left alone.
export function startUpVent({ Deaerator }: PowerPlantState, time: number): PowerPlantAction[] {
  const toggle: PowerPlantAction = { type: "TOGGLE_DEAERATOR_VENT" }
  if (Deaerator.startUpVentOpen) return Deaerator.safeToClose ? [toggle] : []
  return time === 0 && !Deaerator.safeToClose ? [toggle] : []
}
