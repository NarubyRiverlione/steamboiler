import { PressureHoldSettings } from "./pressure-hold"
import { holdLoop } from "./loop-operator"
import { Scenario } from "../scenario"
import { loadSnapshot } from "../snapshot"

export const RejectionLoad = 100 // MW: the load rate (3% of rated per minute) gets there in about 1420 s
export const RejectionOpenAt = 1500 // s: the load has held 100 MW for about 80 s

// Edge (#182, ADR 0053): the grid supply breaker opens at 100 MW. The load steps from 100 MW to the auxiliary load (a few MW), a load
// rejection: the speed rises out of the ±2 rpm window, the generator breaker opens and the bus is dead.
export const loadRejection: Scenario = {
  name: "load-rejection",
  description: "From the turbine-sync snapshot: load to 100 MW, the grid supply breaker opens at 1500 s, the speed leaves the window, the generator breaker opens and the bus is dead",
  duration: RejectionOpenAt + 120,
  sampleEvery: 0.1,
  initial: loadSnapshot("turbine-sync"),
  actions: [
    { at: 0, action: { type: "ADJUST_STEAM_BYPASS_VALVE", payload: { bypassValvePosition: -1 } } },
    { at: 0, action: { type: "SET_LOAD_SETPOINT", payload: { loadSetpoint: RejectionLoad } } },
    { at: RejectionOpenAt, action: { type: "OPEN_GRID_SUPPLY_BREAKER" } },
  ],
  operator: (state, time) => holdLoop(state, time, true, PressureHoldSettings.LoadGasCeiling),
}
