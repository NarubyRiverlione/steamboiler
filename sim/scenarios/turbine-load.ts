import PowerPlantAction from "../../src/context/PowerPlantActions"
import { ratedOutputMW } from "../../src/utils/turbineCalculations"
import { Scenario } from "../scenario"
import { loadSnapshot } from "../snapshot"
import { holdLoop } from "./loop-operator"
import { PressureHoldSettings } from "./pressure-hold"

// The bypass still passes 10 kg/s of full-gas steam past the turbine, which rated output cannot afford: the operator
// shuts it as the load is set, so the plant carries rated output at full gas (#74, ADR 0030; the action is a delta)
const bypassShut: PowerPlantAction = {
  type: "ADJUST_STEAM_BYPASS_VALVE",
  payload: { bypassValvePosition: -1 },
}

// From the settled sync (the `turbine-sync` snapshot: hold mode on, breaker closed at 3000 rpm): the operator sets the
// load setpoint to the rated output and the generator takes it at the load rate (3% of rated per minute, so about
// 2000 s). The load is a resisting torque on the shaft; Hold opens the valve to carry it (#71, ADR 0027). The loop
// operator's holds keep running, with gas allowed up to full gas for the load; the bypass shuts as the load is set and nothing else is touched, so the plant must stay where it is over the last 600 s.
export const LoadTarget: number = ratedOutputMW

export const turbineLoad: Scenario = {
  name: "turbine-load",
  description: "From the turbine-sync snapshot: load set to rated output, speed, pressure and levels hold",
  duration: 3000,
  sampleEvery: 10,
  initial: loadSnapshot("turbine-sync"),
  actions: [
    { at: 0, action: bypassShut },
    { at: 0, action: { type: "SET_LOAD_SETPOINT", payload: { loadSetpoint: LoadTarget } } },
  ],
  operator: (state, time) => holdLoop(state, time, true, PressureHoldSettings.LoadGasCeiling),
}
