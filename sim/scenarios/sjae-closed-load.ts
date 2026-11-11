import { Scenario } from "../scenario"
import { turbineLoad } from "./turbine-load"

// Edge (#91): the same plant and operator as `turbine-load`, with the SJAE valve closed at the start. The air extraction
// pump alone keeps the shell under vacuum at full load, as a real plant with a liquid ring pump does.
export const sjaeClosedLoad: Scenario = {
  name: "sjae-closed-load",
  description: "From the turbine-sync snapshot: SJAE valve closed, load to 125 MW with the air extraction pump running",
  duration: turbineLoad.duration,
  sampleEvery: turbineLoad.sampleEvery,
  initial: turbineLoad.initial,
  actions: [
    ...turbineLoad.actions,
    { at: 0, action: { type: "SET_SJAE_VALVE_POSITION", payload: { sjaeValvePosition: -1 } } },
  ],
  operator: turbineLoad.operator,
}
