import { Scenario } from "../scenario"
import { loadSnapshot } from "../snapshot"
import { holdLoop } from "./loop-operator"

// From the settled sync (the `turbine-sync` snapshot: hold mode on, breaker closed at 3000 rpm): the generator now
// carries load, MW follows the real steam flow and the live condenser pressure (#14). The loop operator's holds keep
// running; nothing else is touched, so the plant must stay where it is for a sim-hour-class steady window.
export const turbineLoad: Scenario = {
  name: "turbine-load",
  description: "From the turbine-sync snapshot: the generator carries load, pressure, levels and speed hold",
  duration: 1800,
  sampleEvery: 10,
  initial: loadSnapshot("turbine-sync"),
  actions: [],
  operator: holdLoop,
}
