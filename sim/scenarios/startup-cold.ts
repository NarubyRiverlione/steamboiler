import { makeInitialState } from "../../src/context/PowerPlantReducer"
import { Scenario } from "../scenario"
import { heatUp, openMainSteam } from "./steps"

// Cold start as far as the current physics allows: heat from 20°C, pull vacuum, open the main
// steam valve above 10 bar, crack the turbine valve. Generator sync is not reachable yet
// (see docs/known-issues.md), so the run ends with the turbine spinning up.
export const startupCold: Scenario = {
  name: "startup-cold",
  description: "Heat from 20°C, pull vacuum, open main steam valve, crack turbine valve",
  duration: 1800,
  sampleEvery: 10,
  initial: makeInitialState(20),
  actions: [...heatUp, ...openMainSteam],
}
