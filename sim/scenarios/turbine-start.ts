import { Scenario } from "../scenario"
import { loadSnapshot } from "../snapshot"
import { AtPressure, openMainSteam, rollTurbine, since } from "./steps"

// From pressure to a rolling turbine: starts from the at-pressure snapshot (end of `heat-up`), opens
// the main steam valve, then the turbine valve to 25%. Times are from the snapshot.
export const turbineStart: Scenario = {
  name: "turbine-start",
  description: "From the at-pressure snapshot: main steam valve, then turbine valve to 25% so the turbine rolls",
  duration: 1800 - AtPressure,
  sampleEvery: 10,
  initial: loadSnapshot("at-pressure"),
  actions: since(AtPressure, [...openMainSteam, ...rollTurbine]),
}
