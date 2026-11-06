import PowerPlantAction from "../../src/context/PowerPlantActions"
import { CstSimulation } from "../../src/context/const"
import { Scenario } from "../scenario"
import { loadSnapshot } from "../snapshot"

const { MaxGasFlow } = CstSimulation.CstBoiler

const gasOff: PowerPlantAction = { type: "DECREASE_GAS_FLOW", amount: MaxGasFlow }
const bypassFullyOpen: PowerPlantAction = { type: "ADJUST_STEAM_BYPASS_VALVE", payload: { bypassValvePosition: 1 } }

// From the synchronised turbine: gas off and the bypass fully open, so the steam draw takes the boiler down to the
// main steam valve's minimum pressure with the turbine valve still open. Nobody acts after that (ADR 0026).
export const lowPressureClose: Scenario = {
  name: "low-pressure-close",
  description: "From the turbine-sync snapshot, gas off and bypass fully open: at 10 bar the main steam valve closes, the turbine trips and no steam leaves after that",
  duration: 1800,
  sampleEvery: 1,
  initial: loadSnapshot("turbine-sync"),
  actions: [
    { at: 0, action: gasOff },
    { at: 0, action: bypassFullyOpen },
  ],
}
