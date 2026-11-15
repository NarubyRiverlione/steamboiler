import { Scenario } from "../scenario"
import { loadSnapshot } from "../snapshot"
import { holdLoop } from "./loop-operator"

// Seconds after the start at which the operator opens the turbine valve on the unloaded rotor in Free
export const OpenAt = 10

// Edge (#72): overspeed trip. The rotor runs unloaded (breaker open, Free) and the operator opens the turbine valve a
// further 30%: the rotor accelerates through the overspeed limit (`MaxRPM`, 3300 rpm) and the turbine trips there (ADR 0040):
// valve to 0, Free, `turbineTripped` set. Nothing else in the plant is touched; the loop operator's holds keep running.
export const turbineOverspeed: Scenario = {
  name: "turbine-overspeed",
  description: "From the turbine-sync snapshot with the breaker open and Free mode: the turbine valve opens, the rotor accelerates to the overspeed limit and the turbine trips",
  duration: 300,
  sampleEvery: 1,
  initial: loadSnapshot("turbine-sync"),
  actions: [
    { at: 0, action: { type: "TOGGLE_GENERATOR_BREAKER" } },
    { at: 0, action: { type: "SET_SPEED_MODE", payload: { speedMode: "free" } } },
    { at: OpenAt, action: { type: "ADJUST_STEAM_TURBINE_VALVE", payload: { turbineValvePosition: 0.3 } } },
  ],
  operator: (state, time) => holdLoop(state, time),
}
