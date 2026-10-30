import { makeInitialState } from "../../src/context/PowerPlantReducer"
import { Scenario } from "../scenario"
import { heatUp, openMainSteam, rollTurbine } from "./steps"

// From pressure to a rolling turbine: replays the cold start, then opens the turbine valve to 25%.
export const turbineStart: Scenario = {
  name: "turbine-start",
  description: "Cold start replay, then turbine valve to 25% so the turbine rolls",
  duration: 1800,
  sampleEvery: 10,
  initial: makeInitialState(20),
  actions: [...heatUp, ...openMainSteam, ...rollTurbine],
}
