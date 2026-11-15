import { Scenario } from "../scenario"
import { turbineLoad } from "./turbine-load"

// Seconds after the start at which the spray valve sticks closed: the plant carries 125 MW as in `turbine-load`, where it has been since about 2050 s
export const StuckAt = 2400

// Edge (#113, ADR 0044): the attemperator spray valve sticks shut at load. The operator switches to Manual and the valve
// is at 0% (the action is a delta, so -1 shuts it whatever it was). Without spray the steam leaves the superheater at its
// free temperature, well over the 540 °C of the design (at 125 MW the plant makes about 100 kg/s, the design flow is 134): the
// high steam temperature alarm must fire, and nothing trips (the protection is the alarm only). The plant must stay inside its
// limits: the turbine carries its load on the hotter steam, the pressure and levels hold, the steam stays within the
// range of the steam table.
export const sprayStuckClosed: Scenario = {
  name: "spray-stuck-closed",
  description: "From the turbine-sync snapshot: load 125 MW, then at 2400 s the attemperator is in Manual at 0%: the steam runs hot, the alarm fires, no trip",
  duration: 3300,
  sampleEvery: 1,
  initial: turbineLoad.initial,
  actions: [
    ...turbineLoad.actions,
    { at: StuckAt, action: { type: "SET_ATTEMPERATOR_AUTO", payload: { attemperatorAuto: false } } },
    { at: StuckAt, action: { type: "SET_SPRAY_VALVE_POSITION", payload: { sprayValvePosition: -1 } } },
  ],
  operator: turbineLoad.operator,
}
