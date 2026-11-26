import PowerPlantAction from "../../src/context/PowerPlantActions"
import PowerPlantState from "../../src/context/PowerPlantState"
import { Scenario } from "../scenario"
import { loadSnapshot } from "../snapshot"
import { holdLoop } from "./loop-operator"

export const DisengageAt = 0 // s: the operator lets go of the gear by hand: the rotor stops, the gland steam goes with it
export const RefusedOpenAt = 5 // s: the operator tries to open the turbine valve on the stopped rotor: refused
export const RefusedGlandAt = 10 // s: the gland steam asked for on the stopped rotor: refused
export const EngageAt = 20 // s: the gear takes the rotor again (the oil is still up)
export const GlandOnAt = 30 // s: the gland steam is admitted on the gear
export const RampUpAt = 35 // s: Ramp up to 500 rpm selected: the PID opens the valve on the gear and the steam rolls the rotor

const act = (at: number, action: PowerPlantAction) => ({ at, action })

// Edge (#146, #147, ADR 0051, ADR 0047): from the settled bypass loop (rotor on the gear at 3 rpm, gland steam on) the
// hand disengage stops the rotor and the gland steam goes off; the valve and the gland steam are refused on the stopped
// rotor; the gear takes it again, the gland steam is admitted, and Ramp up rolls the rotor off the gear: the gear throws
// itself out above the standstill speed and the gland steam stays on.
export const turningGear: Scenario = {
  name: "turning-gear",
  description: "From the bypass-loop snapshot: hand disengage stops the rotor, valve and gland steam refused, engage, gland steam, Ramp up rolls the rotor off the gear",
  duration: 150,
  sampleEvery: 1,
  initial: loadSnapshot("bypass-loop"),
  actions: [
    act(DisengageAt, { type: "SET_TURNING_GEAR", payload: { engaged: false } }),
    act(RefusedOpenAt, { type: "ADJUST_STEAM_TURBINE_VALVE", payload: { turbineValvePosition: 0.1 } }),
    act(RefusedGlandAt, { type: "SET_GLAND_STEAM", payload: { on: true } }),
    act(EngageAt, { type: "SET_TURNING_GEAR", payload: { engaged: true } }),
    act(GlandOnAt, { type: "SET_GLAND_STEAM", payload: { on: true } }),
    act(RampUpAt, { type: "SELECT_RUN_UP_POINT", payload: { runUpPoint: 500 } }),
    act(RampUpAt, { type: "SET_SPEED_MODE", payload: { speedMode: "rampUp" } }),
  ],
  operator: (state: PowerPlantState, time: number): PowerPlantAction[] => holdLoop(state, time),
}
