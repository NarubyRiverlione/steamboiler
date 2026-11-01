import { makeInitialState } from "../../src/context/PowerPlantReducer"
import { Scenario } from "../scenario"
import { heatUp, openMainSteam } from "./steps"

// Cold start as far as the current physics allows: heat from 20°C with the air extraction pump on,
// open the main steam valve above 10 bar and hold the vacuum, crack the turbine valve. Generator sync is not reachable yet
// (see #18), so the run ends with the turbine spinning up.
export const startupCold: Scenario = {
  name: "startup-cold",
  description: "Heat from 20°C, pull vacuum, open main steam valve, hold vacuum, crack turbine valve",
  duration: 1800,
  sampleEvery: 10,
  initial: makeInitialState(),
  actions: [...heatUp, ...openMainSteam],
}
