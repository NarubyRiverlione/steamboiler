import { makeInitialState } from "../../src/context/PowerPlantReducer"
import { Scenario } from "../scenario"
import { setGasCommand } from "./gas"

// Full gas for an hour with everything closed: the relief valve holds the pressure until the burner trips on low water
export const boilerLow: Scenario = {
  name: "boiler-low",
  description:
    "Full gas from cold for an hour with everything closed; the relief valve holds the pressure until the burner trips on low water",
  duration: 3600,
  sampleEvery: 10,
  initial: makeInitialState(),
  actions: [{ at: 0, action: setGasCommand(1) }],
}
