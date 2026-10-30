import { makeInitialState } from "../../src/context/PowerPlantReducer"
import { Scenario } from "../scenario"
import { loopOperator } from "./loop-operator"
import { heatUp } from "./steps"

// The closed water loop without the turbine: boiler → main steam valve → bypass → condenser →
// hotwell → condensation pump → boiler. The operator holds boiler and hotwell level.
export const bypassLoop: Scenario = {
  name: "bypass-loop",
  description: "Cold start, bypass only, operator holds boiler level at 50% via the condensation pump",
  duration: 3600,
  sampleEvery: 10,
  initial: makeInitialState(20),
  actions: heatUp,
  operator: loopOperator,
}
