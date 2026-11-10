import { makeInitialState } from "../../src/context/PowerPlantReducer"
import { Scenario } from "../scenario"
import { loopOperatorWithoutVent } from "./loop-operator"
import { setGasCommand } from "./gas"
import { airPumpOn } from "./steps"

// Edge (#120, ADR 0038): the cold start of `bypass-loop` with the deaerator start-up vent never opened. The air stays in the
// vessel: the heating is slow, the pressure climbs above the 3 bar setpoint and the 4 bar relief valve loses steam. No damage.
export const deaeratorVentClosed: Scenario = {
  name: "deaerator-vent-closed",
  description: "Cold start with the deaerator start-up vent never opened: air stays, pressure rises, the 4 bar relief valve lifts, steam is lost",
  duration: 3600,
  sampleEvery: 10,
  initial: makeInitialState(),
  actions: [airPumpOn, { at: 0, action: setGasCommand(1) }],
  operator: loopOperatorWithoutVent,
}
