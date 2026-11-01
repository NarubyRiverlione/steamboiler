import { makeInitialState } from "../../src/context/PowerPlantReducer"
import { Scenario } from "../scenario"
import { AtPressure, heatUp } from "./steps"

// Cold to main-steam-valve pressure with everything else closed: the source of the `at-pressure` snapshot.
export const heatToMsv: Scenario = {
  name: "heat-to-msv",
  description: "Heat from cold with vacuum pulled, up to main-steam-valve pressure (the at-pressure snapshot)",
  duration: AtPressure,
  sampleEvery: 10,
  initial: makeInitialState(),
  actions: heatUp,
}
