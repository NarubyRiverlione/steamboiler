import { PressureHoldSettings } from "./pressure-hold"
import { holdLoop } from "./loop-operator"
import { Scenario } from "../scenario"
import { loadSnapshot } from "../snapshot"

export const TransferOutAt = 30 // s: the unit aux breaker closes, the grid supply opens on the same tick
export const TransferBackAt = 120 // s: the grid supply breaker closes, the unit aux breaker opens on the same tick

// Edge (#189, ADR 0053): the seamless transfer of the auxiliary bus from the grid supply to the unit aux breaker and back, at a 20 MW load
// on the grid. The bus is never dead and the two breakers are never closed together, so the pumps never stop. From the settled sync
// with the loop operator's holds.
export const unitAuxTransfer: Scenario = {
  name: "unit-aux-transfer",
  description: "From the turbine-sync snapshot: 20 MW load, the unit aux breaker closes at 30 s and the grid supply breaker closes again at 120 s; the bus is never dead and the pumps never stop",
  duration: 240,
  sampleEvery: 0.1,
  initial: loadSnapshot("turbine-sync"),
  actions: [
    { at: 0, action: { type: "SET_LOAD_SETPOINT", payload: { loadSetpoint: 20 } } },
    { at: TransferOutAt, action: { type: "CLOSE_UNIT_AUX_BREAKER" } },
    { at: TransferBackAt, action: { type: "CLOSE_GRID_SUPPLY_BREAKER" } },
  ],
  operator: (state, time) => holdLoop(state, time, true, PressureHoldSettings.LoadGasCeiling),
}
