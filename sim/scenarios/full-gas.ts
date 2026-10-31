import { makeInitialState } from "../../src/context/PowerPlantReducer"
import { CstSimulation } from "../../src/context/const"
import { Scenario } from "../scenario"

// Full gas for an hour with everything closed: only the relief valve holds the pressure, until the boiler runs dry
export const fullGas: Scenario = {
  name: "full-gas",
  description: "Full gas from cold for an hour with everything closed; only the relief valve holds the pressure",
  duration: 3600,
  sampleEvery: 10,
  initial: makeInitialState(),
  actions: [{ at: 0, action: { type: "INCREASE_GAS_FLOW", amount: CstSimulation.CstBoiler.MaxGasFlow } }],
}
