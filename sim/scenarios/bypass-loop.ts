import { makeInitialState } from "../../src/context/PowerPlantReducer"
import { Scenario } from "../scenario"
import PowerPlantAction from "../../src/context/PowerPlantActions"
import PowerPlantState from "../../src/context/PowerPlantState"
import { steerHeatingRate } from "./heat-up"
import { loopOperator } from "./loop-operator"
import { atWorkingPressure } from "./pressure-hold"
import { airPumpOn, glandSteamUp, oilPumpOn } from "./steps"

// The closed water loop without the turbine: boiler → main steam valve → bypass → condenser →
// hotwell → condensation pump → boiler. The operator holds boiler and hotwell level.

// Below working pressure the gas follows the heating rate, the real cold start (#103), also when the pressure dips
// after the main steam valve opens; in the band the loop operator holds the pressure with the gas
export function rampedLoopOperator(state: PowerPlantState, time: number): PowerPlantAction[] {
  const loop: PowerPlantAction[] = loopOperator(state, time)
  if (atWorkingPressure(state.Boiler.pressure)) return loop
  return [...loop.filter((a) => a.type !== "SET_GAS_RATE"), ...steerHeatingRate(state.Boiler, time)]
}

export const bypassLoop: Scenario = {
  name: "bypass-loop",
  description:
    "Cold start with the gas ramped at the heating-rate limit, bypass fixed at 10%, gas holds 165 bar, operator holds boiler level at 50% via the condensation pump",
  duration: 32400,
  sampleEvery: 10,
  initial: makeInitialState(),
  // The standby ends with the gland steam on, the gear out and the lube oil pump stopped (the turbine stands still, ADR 0047)
  actions: [airPumpOn, oilPumpOn, ...glandSteamUp, { at: 32000, action: { type: "SET_OIL_PUMP", payload: { pumpRunning: false } } }],
  operator: rampedLoopOperator,
}
