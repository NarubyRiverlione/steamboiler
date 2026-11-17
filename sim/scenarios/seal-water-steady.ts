import { Scenario } from "../scenario"
import { loadSnapshot } from "../snapshot"
import { holdLoop } from "./loop-operator"

// Edge (#166): the settled plant with the air pump running for two hours (the pump hogs and the SJAE holds). The seal water cooler works, so the
// seal water settles near 20 °C and the pump runs on indefinitely, with no warning and no trip.
export const sealWaterSteady: Scenario = {
  name: "seal-water-steady",
  description: "From the turbine-sync snapshot with the air pump running for 2 h: the seal water cooler holds the seal water under the warning and the pump runs on",
  duration: 7200,
  sampleEvery: 10,
  initial: loadSnapshot("turbine-sync"),
  actions: [],
  operator: (state, time) => holdLoop(state, time),
}
