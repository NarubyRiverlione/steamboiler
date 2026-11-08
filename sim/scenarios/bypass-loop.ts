import { makeInitialState } from "../../src/context/PowerPlantReducer"
import { Scenario } from "../scenario"
import { loopOperator } from "./loop-operator"
import { setGasCommand } from "./gas"
import { airPumpOn } from "./steps"

// The closed water loop without the turbine: boiler → main steam valve → bypass → condenser →
// hotwell → condensation pump → boiler. The operator holds boiler and hotwell level.

// t=0: the knob turned fully up and left there, the gas ramps to full in 40 s; the operator brings it back at pressure
const fullGas = [airPumpOn, { at: 0, action: setGasCommand(1) }]

export const bypassLoop: Scenario = {
  name: "bypass-loop",
  description:
    "Cold start at full gas, bypass fixed at 10%, gas holds 165 bar, operator holds boiler level at 50% via the condensation pump",
  duration: 7200,
  sampleEvery: 10,
  initial: makeInitialState(),
  actions: fullGas,
  operator: loopOperator,
}
