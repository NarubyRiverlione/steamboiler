import { PressureHoldSettings } from "./pressure-hold"
import { holdLoop } from "./loop-operator"
import { Scenario } from "../scenario"
import { loadSnapshot } from "../snapshot"

export const LoadSetpoint = 2 // MW: low, so the step down to the auxiliary load (about 0.5 MW) stays inside the sync window
export const OpenAt = 60 // s: the load has reached the setpoint (about 30 s at the load rate)

// Edge (#182, ADR 0053, ADR 0027): the grid supply breaker opens at a low load. The generator breaker stays closed, the generator
// carries the auxiliary load (house load operation) and the pumps keep running. From the settled sync with a 2 MW setpoint
// and the loop operator's holds. The load the tie still opens at is recorded in docs/plant/turbine.md.
export const houseLoadHold: Scenario = {
  name: "house-load-hold",
  description: "From the turbine-sync snapshot: 2 MW load, the grid supply breaker opens at 60 s, the generator carries the auxiliary load and the pumps keep running",
  duration: 360,
  sampleEvery: 0.1,
  initial: loadSnapshot("turbine-sync"),
  actions: [
    { at: 0, action: { type: "SET_LOAD_SETPOINT", payload: { loadSetpoint: LoadSetpoint } } },
    { at: OpenAt, action: { type: "OPEN_GRID_SUPPLY_BREAKER" } },
  ],
  operator: (state, time) => holdLoop(state, time, true, PressureHoldSettings.LoadGasCeiling),
}
