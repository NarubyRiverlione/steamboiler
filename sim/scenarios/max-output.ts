import PowerPlantAction from "../../src/context/PowerPlantActions"
import { CstSimulation } from "../../src/context/const"
import { Scenario } from "../scenario"
import { loadSnapshot } from "../snapshot"
import { holdLoop } from "./loop-operator"
import { PressureHoldSettings } from "./pressure-hold"

const setLoad: PowerPlantAction = {
  type: "SET_LOAD_SETPOINT",
  payload: { loadSetpoint: CstSimulation.CstTurbine.LoadSetpointLimit },
}
const bypassShut: PowerPlantAction = { type: "ADJUST_STEAM_BYPASS_VALVE", payload: { bypassValvePosition: 0 } }

// From the settled sync: the bypass shuts and the setpoint goes to its limit, above anything the steam can carry, so the
// load climbs at the load rate past rated output. Hold opens the valve until it is fully open; the speed then sags and
// the breaker opens at -2 rpm (#84). The electric output is the load carried, so the last load before that is the most
// the plant can give. A fixed 100% valve would not measure it: with nothing to absorb the power the shaft speeds up.
export const maxOutput: Scenario = {
  name: "max-output",
  description: "From the turbine-sync snapshot: load past rated until the turbine valve is fully open and the breaker opens on the speed sag",
  duration: 3000,
  sampleEvery: 1,
  initial: loadSnapshot("turbine-sync"),
  actions: [
    { at: 0, action: bypassShut },
    { at: 0, action: setLoad },
  ],
  operator: (state, time) => holdLoop(state, time, true, PressureHoldSettings.LoadGasCeiling),
}
