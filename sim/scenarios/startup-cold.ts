import { makeInitialState } from "../../src/context/PowerPlantReducer"
import { Scenario } from "../scenario"

// Cold start as far as the current physics allows: heat from 20°C, pull vacuum, open the main
// steam valve above 10 bar, crack the turbine valve. Generator sync is not reachable yet
// (see docs/known-issues.md), so the run ends with the turbine spinning up.
export const startupCold: Scenario = {
  name: "startup-cold",
  description: "Heat from 20°C, pull vacuum, open main steam valve, crack turbine valve",
  duration: 1800,
  sampleEvery: 10,
  initial: makeInitialState(20),
  actions: [
    { at: 0, action: { type: "INCREASE_GAS_FLOW", amount: 2000 } },
    {
      at: 0,
      action: { type: "SET_AIR_EXTRACTION_PUMP_ENABLED", payload: { isAirExtractionPumpEnabled: true } },
    },
    { at: 0, action: { type: "SET_SJAE_ENABLED", payload: { isSjaeEnabled: true } } },
    // ~11.6 bar by now; the reducer refuses below 10 bar
    { at: 720, action: { type: "TOGGLE_MAIN_STEAM_VALVE" } },
    { at: 730, action: { type: "ADJUST_STEAM_TURBINE_VALVE", payload: { turbineValvePosition: 0.05 } } },
  ],
}
