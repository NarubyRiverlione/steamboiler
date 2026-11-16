import PowerPlantAction from "../../src/context/PowerPlantActions"
import PowerPlantState from "../../src/context/PowerPlantState"
import { Scenario } from "../scenario"
import { loadSnapshot } from "../snapshot"
import { holdLoop } from "./loop-operator"
import { GearEngageAt, withStoppedRotor } from "./steps"

export const OilStartAt = 0 // s: the pump starts, the header builds
export const GearOnAt = GearEngageAt // s: the header has built, the gear takes the rotor so that the valve may open
export const RollAt = 60 // s: Ramp up toward 500 rpm, the valve opens on the built pressure
export const PumpStopAt = 300 // s: the pump stops with the turbine running; the header decays through the trip limit
export const RefusedResetAt = 400 // s: no oil, the reset is refused
export const PumpRestartAt = 410 // s: the pump starts again
export const ResetAt = 430 // s: the header has recovered, the reset clears the trip

const act = (at: number, action: PowerPlantAction) => ({ at, action })

// Edge (#145, ADR 0050): from the settled bypass loop (turbine at standstill, steam to the condenser by the bypass) the
// operator starts the lube oil pump and the header builds; Ramp up rolls the turbine; stopping the pump makes the header
// decay below the trip limit and the running turbine trips; a reset with no oil is refused, and after the pump restart
// and the pressure recovery the reset clears the trip.
export const lubeOilTrip: Scenario = {
  name: "lube-oil-trip",
  description: "From the bypass-loop snapshot: oil pump on, turbine rolls, pump off, the low-pressure trip, a refused reset, pump on, the reset",
  duration: 500,
  sampleEvery: 1,
  initial: withStoppedRotor(loadSnapshot("bypass-loop")),
  actions: [
    act(OilStartAt, { type: "SET_OIL_PUMP", payload: { pumpRunning: true } }),
    act(GearOnAt, { type: "SET_TURNING_GEAR", payload: { engaged: true } }),
    act(RollAt, { type: "SELECT_RUN_UP_POINT", payload: { runUpPoint: 500 } }),
    act(RollAt, { type: "SET_SPEED_MODE", payload: { speedMode: "rampUp" } }),
    act(PumpStopAt, { type: "SET_OIL_PUMP", payload: { pumpRunning: false } }),
    act(RefusedResetAt, { type: "RESET_TRIP", payload: { trip: "turbine" } }),
    act(PumpRestartAt, { type: "SET_OIL_PUMP", payload: { pumpRunning: true } }),
    act(ResetAt, { type: "RESET_TRIP", payload: { trip: "turbine" } }),
  ],
  operator: (state: PowerPlantState, time: number): PowerPlantAction[] => holdLoop(state, time),
}
