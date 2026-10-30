import { makeInitialState } from "../../src/context/PowerPlantReducer"
import { Scenario } from "../scenario"
import { heatUp, openMainSteam, rollTurbine, StartGas, TurbineValveOpenAt } from "./steps"

// Operator tries to close the breaker at the end of the run
export const BreakerAttemptAt = 3590

// From a rolling turbine to sync speed: more gas, turbine valve fully open, then close the breaker.
// Not reachable with the current physics (#18, #21).
export const turbineSync: Scenario = {
  name: "turbine-sync",
  description: "Turbine-start replay, then more gas and full turbine valve to reach sync speed",
  duration: 3600,
  sampleEvery: 10,
  initial: makeInitialState(),
  actions: [
    ...heatUp,
    ...openMainSteam,
    ...rollTurbine,
    { at: TurbineValveOpenAt + 10, action: { type: "INCREASE_GAS_FLOW", amount: 2 * StartGas } },
    {
      at: TurbineValveOpenAt + 10,
      action: { type: "ADJUST_STEAM_TURBINE_VALVE", payload: { turbineValvePosition: 1 } },
    },
    { at: BreakerAttemptAt, action: { type: "TOGGLE_GENERATOR_BREAKER" } },
  ],
}
