import { makeInitialState } from "../../src/context/PowerPlantReducer"
import { Scenario } from "../scenario"
import { loopOperatorLeavingVentOpen } from "./loop-operator"
import { setGasCommand } from "./gas"
import { airPumpOn } from "./steps"

// Edge (#120, ADR 0038): the cold start of `bypass-loop` with the deaerator start-up vent opened at the start and left open.
// The air goes, then steam leaves through the vent: it leaves the water balance and returns as makeup demand, and the
// temperature stalls near 100 °C instead of reaching the 3 bar setpoint.
export const deaeratorVentOpen: Scenario = {
  name: "deaerator-vent-open",
  description: "Cold start with the deaerator start-up vent opened and left open: the air goes, steam is lost through the vent, the temperature stalls near 100 °C",
  duration: 3600,
  sampleEvery: 10,
  initial: makeInitialState(),
  actions: [airPumpOn, { at: 0, action: setGasCommand(1) }, { at: 0, action: { type: "TOGGLE_DEAERATOR_VENT" } }],
  operator: loopOperatorLeavingVentOpen,
}
