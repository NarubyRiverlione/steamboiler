import { CstSimulation } from "../../src/context/const"
import { Scenario } from "../scenario"
import { loadSnapshot } from "../snapshot"
import { loopOperator } from "./loop-operator"

const { MaxGasFlow } = CstSimulation.CstBoiler

// Seconds after the start at which the Return stops: the economizer has the Return at full gas, the relief valve is
// already holding the pressure
export const ReturnStopAt = 15

const initial = loadSnapshot("bypass-loop")

// Edge (#87, #74): the Return stops at full gas. The economizer recovers nothing, so about 60 MW less goes into the water in
// one tick (no thermal mass in the economizer, ADR 0029); the pressure must stay controlled with no lag added. From the
// settled bypass loop the gas goes to full and the bypass fully open, which cannot carry what full gas makes, so the
// relief valve holds the pressure. At ReturnStopAt the condensation pump is shut and held shut. The gas stays at full:
// the operator's pressure hold is taken away, as are the pump nudges after the stop.
export const returnStop: Scenario = {
  name: "return-stop",
  description:
    "From the bypass-loop snapshot: full gas and the bypass fully open, then the condensation pump shuts at 15 s and the Return stops",
  duration: 120,
  sampleEvery: 1,
  initial,
  actions: [
    { at: 0, action: { type: "INCREASE_GAS_FLOW", amount: MaxGasFlow - initial.Boiler.gasFlow } },
    {
      at: 0,
      action: {
        type: "ADJUST_STEAM_BYPASS_VALVE",
        payload: { bypassValvePosition: 1 - initial.Turbine.bypassValvePosition },
      },
    },
    {
      at: ReturnStopAt,
      action: {
        type: "SET_CONDENSATION_PUMP_VALVE_POSITION",
        payload: { condensationPumpValvePosition: -1 },
      },
    },
  ],
  operator: (state, time) =>
    loopOperator(state, time).filter(
      (a) =>
        a.type !== "INCREASE_GAS_FLOW" &&
        a.type !== "DECREASE_GAS_FLOW" &&
        !(time >= ReturnStopAt && a.type === "SET_CONDENSATION_PUMP_VALVE_POSITION"),
    ),
}
