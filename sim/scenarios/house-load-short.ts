import { PressureHoldSettings } from "./pressure-hold"
import { holdLoop } from "./loop-operator"
import { Scenario } from "../scenario"
import { loadSnapshot } from "../snapshot"
import { HouseLoadSetpoint, TieOpenAt, TransferAt } from "./house-load-hold"

// Edge (#182, #189, ADR 0053): house load operation with too little steam. As `house-load-hold`, but the main steam valve shuts as the
// generator breaker opens, so no steam reaches the turbine: the auxiliary load slows the rotor, the speed leaves the window downwards,
// the unit aux breaker opens and the bus is dead.
export const houseLoadShort: Scenario = {
  name: "house-load-short",
  description: "From the turbine-sync snapshot: 2 MW load, the unit aux breaker closes at 40 s, the generator breaker opens and the main steam valve shuts at 60 s, the speed falls, the unit aux breaker opens and the bus is dead",
  duration: 300,
  sampleEvery: 0.1,
  initial: loadSnapshot("turbine-sync"),
  actions: [
    { at: 0, action: { type: "SET_LOAD_SETPOINT", payload: { loadSetpoint: HouseLoadSetpoint } } },
    { at: TransferAt, action: { type: "CLOSE_UNIT_AUX_BREAKER" } },
    { at: TieOpenAt, action: { type: "TOGGLE_GENERATOR_BREAKER" } },
    { at: TieOpenAt, action: { type: "TOGGLE_MAIN_STEAM_VALVE" } },
  ],
  operator: (state, time) => holdLoop(state, time, true, PressureHoldSettings.LoadGasCeiling),
}
