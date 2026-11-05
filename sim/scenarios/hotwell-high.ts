import { Scenario } from "../scenario"
import { loadSnapshot } from "../snapshot"
import { loopOperatorWithoutHotwellHold } from "./loop-operator"

// Edge: the hotwell fills past HotwellHighHigh (95%). From the settled bypass loop, makeup is forced fully open and the
// reject shut, so the level climbs until the overfill clamp forces the reject open.
const initial = loadSnapshot("bypass-loop")
const { makeupValvePosition, rejectValvePosition } = initial.Condenser

export const hotwellHigh: Scenario = {
  name: "hotwell-high",
  description: "From the bypass-loop snapshot: makeup open and reject shut until the hotwell reaches 95% and the reject is forced open",
  duration: 600,
  sampleEvery: 1,
  initial,
  actions: [
    { at: 0, action: { type: "SET_MAKEUP_VALVE_POSITION", payload: { makeupValvePosition: 1 - makeupValvePosition } } },
    { at: 0, action: { type: "SET_REJECT_VALVE_POSITION", payload: { rejectValvePosition: -rejectValvePosition } } },
  ],
  operator: loopOperatorWithoutHotwellHold,
}
