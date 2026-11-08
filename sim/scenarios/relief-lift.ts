import { makeInitialState } from "../../src/context/PowerPlantReducer"
import { Scenario } from "../scenario"
import { setGasCommand } from "./gas"

// Full gas lifts the relief valve at about 227 s (35% cold fill, ADR 0018); the gas goes off during that lift
export const GasOffAt = 230

// Full gas from cold with everything closed until the relief valve lifts, then gas off so it reseats and the boiler cools
export const reliefLift: Scenario = {
  name: "relief-lift",
  description:
    "Full gas from cold with everything closed until the relief valve lifts, then gas off so it reseats",
  duration: 600,
  sampleEvery: 1,
  initial: makeInitialState(),
  actions: [
    { at: 0, action: setGasCommand(1) },
    { at: GasOffAt, action: setGasCommand(-1) },
  ],
}
