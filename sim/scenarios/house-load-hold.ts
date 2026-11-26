import { PressureHoldSettings } from "./pressure-hold"
import { holdLoop } from "./loop-operator"
import { Scenario } from "../scenario"
import { loadSnapshot } from "../snapshot"

export const HouseLoadSetpoint = 2 // MW: low, so the step down to the auxiliary load (about 0.5 MW) stays inside the sync window
export const TransferAt = 40 // s: the unit aux breaker closes and the grid supply opens on the same tick
export const TieOpenAt = 60 // s: the generator breaker opens, the plant is an island (the load has reached the setpoint, about 30 s at the load rate)

// Edge (#182, #189, ADR 0053, ADR 0027): the unit aux breaker closes (the grid supply opens with it), then the generator breaker opens at a low
// load. The generator carries the auxiliary load alone (house load operation, the island) and the pumps keep running. From the settled sync
// with a 2 MW setpoint and the loop operator's holds. The load the tie still opens at is recorded in docs/plant/turbine.md.
export const houseLoadHold: Scenario = {
  name: "house-load-hold",
  description: "From the turbine-sync snapshot: 2 MW load, the unit aux breaker closes at 40 s, the generator breaker opens at 60 s, the generator carries the auxiliary load and the pumps keep running",
  duration: 360,
  sampleEvery: 0.1,
  initial: loadSnapshot("turbine-sync"),
  actions: [
    { at: 0, action: { type: "SET_LOAD_SETPOINT", payload: { loadSetpoint: HouseLoadSetpoint } } },
    { at: TransferAt, action: { type: "CLOSE_UNIT_AUX_BREAKER" } },
    { at: TieOpenAt, action: { type: "TOGGLE_GENERATOR_BREAKER" } },
  ],
  operator: (state, time) => holdLoop(state, time, true, PressureHoldSettings.LoadGasCeiling),
}
