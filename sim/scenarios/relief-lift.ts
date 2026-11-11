import { makeInitialState } from "../../src/context/PowerPlantReducer"
import { Scenario } from "../scenario"
import { setGasCommand } from "./gas"
import { startUpVent } from "./steps"

// Full gas would lift the relief valve at about 259 s (35% cold fill, ADR 0018; the deaerator draws let-down steam from the boiler as it warms up, #119). The gas goes off at 250 s, before that: the knob takes 40 s to bring it down, so the pressure still peaks on the heat in the water and lifts once (at about 261 s)
export const GasOffAt = 250

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
  operator: startUpVent,
}
