import { Scenario } from "../scenario"
import { loadSnapshot } from "../snapshot"
import { setGasCommand } from "./gas"
import { loopOperator } from "./loop-operator"

// Seconds after the start at which the Return stops: the knob turned fully up takes about 35 s to bring the snapshot's gas
// to full, so the economizer has the Return at full gas, with the pressure still below the relief valve
export const ReturnStopAt = 45

const initial = loadSnapshot("bypass-loop")

// Bypass position at the start: the gas ramps up instead of jumping (#15), so a fully open bypass would let the pressure
// fall for 40 s and need 130 s to climb back to the relief valve. 70% carries most of the steam and still lets it hold.
const BypassOpening = 0.7

// Edge (#87, #74): the Return stops at full gas. The economizer recovers nothing, so about 60 MW less goes into the water in
// one tick (no thermal mass in the economizer, ADR 0029); the pressure must stay controlled with no lag added. From the
// settled bypass loop the knob goes fully up and the bypass 70% open, which cannot carry what full gas makes, so the
// relief valve holds the pressure once the Return stops. At ReturnStopAt the condensation pump is shut and held shut. The gas stays at full:
// the operator's pressure hold is taken away, as are the pump nudges after the stop.
export const returnStop: Scenario = {
  name: "return-stop",
  description:
    "From the bypass-loop snapshot: knob fully up and the bypass 70% open, then the condensation pump shuts at 45 s and the Return stops",
  duration: 150,
  sampleEvery: 1,
  initial,
  actions: [
    { at: 0, action: setGasCommand(1) },
    {
      at: 0,
      action: {
        type: "ADJUST_STEAM_BYPASS_VALVE",
        payload: { bypassValvePosition: BypassOpening - initial.Turbine.bypassValvePosition },
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
        a.type !== "SET_GAS_RATE" &&
        !(time >= ReturnStopAt && a.type === "SET_CONDENSATION_PUMP_VALVE_POSITION"),
    ),
}
