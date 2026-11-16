import PowerPlantAction from "../../src/context/PowerPlantActions"
import PowerPlantState from "../../src/context/PowerPlantState"
import { Scenario } from "../scenario"
import { loadSnapshot } from "../snapshot"
import { holdLoop } from "./loop-operator"

export const NoOilEngageAt = 0 // s: the pump starts with the header empty, the engage is refused
export const EngageAt = 20 // s: the header has built, the engage is accepted and the gear turns the rotor
export const RampUpAt = 25 // s: Ramp up to 500 rpm selected: the PID may not open the valve on gear
export const RefusedOpenAt = 30 // s: the operator tries to open the turbine valve by hand: refused
export const DisengageAt = 60 // s: the operator disengages by hand, the PID opens the valve and the rotor rolls

const act = (at: number, action: PowerPlantAction) => ({ at, action })

// Edge (#146, ADR 0051): from the settled bypass loop (turbine at standstill) the engage with no oil is refused, the
// engage on the built oil pressure holds the rotor at a few rpm, the turbine valve refuses to open on gear (by hand and
// for the Ramp up PID), and after the disengage the valve opens as before and the turbine rolls.
export const turningGear: Scenario = {
  name: "turning-gear",
  description: "From the bypass-loop snapshot: engage refused with no oil, engage, valve refused on gear, disengage, the turbine rolls",
  duration: 120,
  sampleEvery: 1,
  initial: loadSnapshot("bypass-loop"),
  actions: [
    act(NoOilEngageAt, { type: "SET_TURNING_GEAR", payload: { engaged: true } }),
    act(NoOilEngageAt, { type: "SET_OIL_PUMP", payload: { pumpRunning: true } }),
    act(EngageAt, { type: "SET_TURNING_GEAR", payload: { engaged: true } }),
    act(RampUpAt, { type: "SELECT_RUN_UP_POINT", payload: { runUpPoint: 500 } }),
    act(RampUpAt, { type: "SET_SPEED_MODE", payload: { speedMode: "rampUp" } }),
    act(RefusedOpenAt, { type: "ADJUST_STEAM_TURBINE_VALVE", payload: { turbineValvePosition: 0.1 } }),
    act(DisengageAt, { type: "SET_TURNING_GEAR", payload: { engaged: false } }),
  ],
  operator: (state: PowerPlantState, time: number): PowerPlantAction[] => holdLoop(state, time),
}
