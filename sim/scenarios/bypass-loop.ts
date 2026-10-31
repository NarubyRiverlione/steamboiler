import { CstSimulation } from "../../src/context/const"
import { makeInitialState } from "../../src/context/PowerPlantReducer"
import { Scenario } from "../scenario"
import { loopOperator } from "./loop-operator"
import { heatUp, StartGas } from "./steps"

// The closed water loop without the turbine: boiler → main steam valve → bypass → condenser →
// hotwell → condensation pump → boiler. The operator holds boiler and hotwell level.

// t=0: on top of the heat-up gas, open the burner to full gas flow
const fullGas = [
  ...heatUp,
  { at: 0, action: { type: "INCREASE_GAS_FLOW", amount: CstSimulation.CstBoiler.MaxGasFlow - StartGas } } as const,
]

export const bypassLoop: Scenario = {
  name: "bypass-loop",
  description: "Cold start at full gas, bypass only, operator holds boiler level at 50% via the condensation pump",
  duration: 3600,
  sampleEvery: 10,
  initial: makeInitialState(),
  actions: fullGas,
  operator: loopOperator,
}
