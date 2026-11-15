import { Scenario } from "../scenario"
import { loadSnapshot } from "../snapshot"
import { hotwellLevel } from "../../src/utils/condenserCalculation"
import { loopOperatorWithoutHotwellHold } from "./loop-operator"

const initial = loadSnapshot("bypass-loop")

const HotwellFilled = 0.9 // hotwell level at which the condensation pump is opened: under the 95% overfill clamp

// Edge (#129): the deaerator is overfilled. From the settled bypass loop the feed pump is forced shut and the loop operator's
// feed pump and hotwell holds are taken away. The closed loop holds too little water to fill the deaerator from 50% to 85%
// (the hotwell would trip its own low-low first), so makeup is forced open and the condensation pump stays shut until the
// hotwell is 90% full, then it is held fully open. The level climbs through the 75% warning to the 85% high-high trip
// (ADR 0045): the pump valve goes shut, its own flag is set and the level stays just above 85%.
export const deaeratorHigh: Scenario = {
  name: "deaerator-high",
  description: "From the bypass-loop snapshot: the feed pump shut and a full hotwell pumped open overfill the deaerator until the high-high trip shuts the condensation pump at 85%",
  duration: 900,
  sampleEvery: 1,
  initial,
  actions: [
    { at: 0, action: { type: "SET_FEED_PUMP_VALVE_POSITION", payload: { feedPumpValvePosition: -initial.Deaerator.feedPumpValvePosition } } },
    { at: 0, action: { type: "SET_MAKEUP_VALVE_POSITION", payload: { makeupValvePosition: 1 - initial.Condenser.makeupValvePosition } } },
    { at: 0, action: { type: "SET_CONDENSATION_PUMP_VALVE_POSITION", payload: { condensationPumpValvePosition: -initial.Condenser.condensationPumpValvePosition } } },
  ],
  operator: (state, time) => [
    ...loopOperatorWithoutHotwellHold(state, time).filter((a) => a.type !== "SET_FEED_PUMP_VALVE_POSITION" && a.type !== "SET_CONDENSATION_PUMP_VALVE_POSITION"),
    ...(hotwellLevel(state.Condenser.hotwellWaterVolume) >= HotwellFilled && state.Condenser.condensationPumpValvePosition < 1 && !state.Condenser.condensationPumpTripped
      ? [{ type: "SET_CONDENSATION_PUMP_VALVE_POSITION" as const, payload: { condensationPumpValvePosition: 1 - state.Condenser.condensationPumpValvePosition } }]
      : []),
  ],
}
