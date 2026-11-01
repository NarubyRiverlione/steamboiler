import { makeInitialState } from "../../src/context/PowerPlantReducer"
import { CstSimulation } from "../../src/context/const"
import { Scenario } from "../scenario"

const { MaxGasFlow } = CstSimulation.CstBoiler

// Full gas lifts the relief valve at about 264 s; the gas goes off during that lift
export const GasOffAt = 266

// Full gas from cold with everything closed until the relief valve lifts, then gas off so it reseats and the boiler cools
export const reliefLift: Scenario = {
  name: "relief-lift",
  description: "Full gas from cold with everything closed until the relief valve lifts, then gas off so it reseats",
  duration: 600,
  sampleEvery: 1,
  initial: makeInitialState(),
  actions: [
    { at: 0, action: { type: "INCREASE_GAS_FLOW", amount: MaxGasFlow } },
    { at: GasOffAt, action: { type: "DECREASE_GAS_FLOW", amount: MaxGasFlow } },
  ],
}
