import PowerPlantAction from "../../src/context/PowerPlantActions"
import { Scenario } from "../scenario"
import { loadSnapshot } from "../snapshot"
import { setGasCommand } from "./gas"

const gasOff: PowerPlantAction = setGasCommand(-1)
const bypassFullyOpen: PowerPlantAction = {
  type: "ADJUST_STEAM_BYPASS_VALVE",
  payload: { bypassValvePosition: 1 },
}

// The cooling water fully open: the full bypass flow is more than the exchanger takes at the cooling water the plant
// holds at 125 MW, and without it the condenser would lose its vacuum at once (ADR 0035)
const coolingFullyOpen: PowerPlantAction = {
  type: "SET_RECIRCULATION_PUMP_VALVE_POSITION",
  payload: { recirculationPumpValvePosition: 1 },
}

// From the synchronised turbine: gas off and the bypass fully open, so the steam draw takes the boiler down to the
// main steam valve's minimum pressure with the turbine valve still open. Nobody acts after that (ADR 0026).
export const lowPressureClose: Scenario = {
  name: "low-pressure-close",
  description:
    "From the turbine-sync snapshot, knob turned fully down, bypass and cooling water fully open: at 10 bar the main steam valve closes, the turbine trips and no steam leaves after that",
  duration: 1800,
  sampleEvery: 1,
  initial: loadSnapshot("turbine-sync"),
  actions: [
    { at: 0, action: gasOff },
    { at: 0, action: bypassFullyOpen },
    { at: 0, action: coolingFullyOpen },
  ],
}
