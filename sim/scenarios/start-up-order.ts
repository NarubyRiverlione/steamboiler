import PowerPlantAction from "../../src/context/PowerPlantActions"
import PowerPlantState from "../../src/context/PowerPlantState"
import { Scenario } from "../scenario"
import { loadSnapshot } from "../snapshot"
import { holdLoop } from "./loop-operator"
import { withStoppedRotor } from "./steps"

export const ValveNoOilAt = 5 // s: the turbine valve asked for with the oil off, the gear out and the rotor stopped: refused
export const GlandAt = 10 // s: the gland steam asked for on the stopped rotor with the gear out: refused
export const OilOnAt = 20 // s: the lube oil pump starts, the header builds
export const ValveNoGearAt = 40 // s: oil is up but the gear is out: the valve is still refused on the stopped rotor
export const GearOnAt = 60 // s: the gear takes the stopped rotor
export const GlandOnAt = 61 // s: the gland steam is admitted on the gear
export const RampUpAt = 70 // s: Ramp up to 500 rpm selected: the PID opens the valve and the steam rolls the rotor

const act = (at: number, action: PowerPlantAction) => ({ at, action })

// Edge (#148, ADR 0016, ADR 0051): from the settled bypass loop with the rotor stopped, off the gear, the oil off and the glands
// unsealed, the operator rolls in the wrong order. The turbine valve is refused without oil and then with the oil up but the gear
// out, and the gland steam is refused on the stopped rotor; nothing moves. Then the real order (oil, gear, gland steam, roll) works.
// Only the outcome is judged: the per-ticket scenarios turning-gear, lube-oil-trip and gland-seal pin each refusal.
export const startUpOrder: Scenario = {
  name: "start-up-order",
  description: "From the bypass-loop snapshot with a stopped rotor: valve without oil, gland steam on the stopped rotor and valve without the gear are refused, then the real order rolls the rotor",
  duration: 150,
  sampleEvery: 1,
  initial: withStoppedRotor(loadSnapshot("bypass-loop")),
  actions: [
    act(ValveNoOilAt, { type: "ADJUST_STEAM_TURBINE_VALVE", payload: { turbineValvePosition: 0.1 } }),
    act(GlandAt, { type: "SET_GLAND_STEAM", payload: { on: true } }),
    act(OilOnAt, { type: "SET_OIL_PUMP", payload: { pumpRunning: true } }),
    act(ValveNoGearAt, { type: "ADJUST_STEAM_TURBINE_VALVE", payload: { turbineValvePosition: 0.1 } }),
    act(GearOnAt, { type: "SET_TURNING_GEAR", payload: { engaged: true } }),
    act(GlandOnAt, { type: "SET_GLAND_STEAM", payload: { on: true } }),
    act(RampUpAt, { type: "SELECT_RUN_UP_POINT", payload: { runUpPoint: 500 } }),
    act(RampUpAt, { type: "SET_SPEED_MODE", payload: { speedMode: "rampUp" } }),
  ],
  operator: (state: PowerPlantState, time: number): PowerPlantAction[] => holdLoop(state, time),
}
