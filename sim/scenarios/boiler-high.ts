import { Scenario } from "../scenario"
import { loadSnapshot } from "../snapshot"
import { loopOperator } from "./loop-operator"

const initial = loadSnapshot("bypass-loop")

// Edge (#62): the boiler is overfed. From the settled bypass loop the boiler feed pump is forced fully open and the loop
// operator's boiler level hold is taken away (the loop operator never opens the pump against its own level hold, so nothing
// else is forced). The level climbs through the 65% alarm to the 70% high-high trip (ADR 0041): the pump valve goes shut and
// the boiler never nears full. The turbine is not running in this snapshot, so only the pump trips.
export const boilerHigh: Scenario = {
  name: "boiler-high",
  description: "From the bypass-loop snapshot: the feed pump fully open overfeeds the boiler until the high-high trip shuts the pump at 70%",
  duration: 900,
  sampleEvery: 1,
  initial,
  actions: [
    { at: 0, action: { type: "SET_FEED_PUMP_VALVE_POSITION", payload: { feedPumpValvePosition: 1 - initial.Deaerator.feedPumpValvePosition } } },
  ],
  operator: (state, time) => loopOperator(state, time).filter((a) => a.type !== "SET_FEED_PUMP_VALVE_POSITION"),
}
