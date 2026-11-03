import { Scenario } from "../scenario"
import { loadSnapshot } from "../snapshot"
import { loopOperatorWithoutHotwellHold } from "./loop-operator"

// Edge: the hotwell runs down past HotwellLowLow (10%). The closed loop conserves its water, so shutting the makeup
// alone never drains the hotwell: from the settled bypass loop the makeup is shut and the reject forced fully open
// (a stuck-open reject valve), draining it at ~50 kg/s while the loop runs.
const initial = loadSnapshot("bypass-loop")
const { makeupValvePosition, rejectValvePosition } = initial.Condenser

export const hotwellLow: Scenario = {
  name: "hotwell-low",
  description: "From the bypass-loop snapshot: makeup shut and reject open while the loop runs until the hotwell reaches 10% and the condensation pump trips",
  duration: 700,
  sampleEvery: 1,
  initial,
  actions: [
    { at: 0, action: { type: "SET_MAKEUP_VALVE_POSITION", payload: { makeupValvePosition: -makeupValvePosition } } },
    { at: 0, action: { type: "SET_REJECT_VALVE_POSITION", payload: { rejectValvePosition: 1 - rejectValvePosition } } },
  ],
  operator: loopOperatorWithoutHotwellHold,
}
