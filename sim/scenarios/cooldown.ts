import { makeInitialState } from "../../src/context/PowerPlantReducer"
import { Scenario } from "../scenario"
import { AtPressure, heatUp, StartGas } from "./steps"

export const CooldownDuration = 3600 // sim-seconds of natural cooldown

// Natural cooldown: heat up to pressure with all valves closed, then gas off for 60 min.
export const cooldown: Scenario = {
  name: "cooldown",
  description: "Heat up to pressure, then gas off with all valves closed for 60 min",
  duration: AtPressure + CooldownDuration,
  sampleEvery: 10,
  initial: makeInitialState(20),
  actions: [...heatUp, { at: AtPressure, action: { type: "DECREASE_GAS_FLOW", amount: StartGas } }],
}
