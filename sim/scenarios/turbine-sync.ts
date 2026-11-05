import PowerPlantAction from "../../src/context/PowerPlantActions"
import PowerPlantState from "../../src/context/PowerPlantState"
import { isAtSyncSpeed } from "../../src/utils/turbineCalculations"
import { Scenario } from "../scenario"
import { loadSnapshot } from "../snapshot"
import { holdLoop } from "./loop-operator"

// From the settled run-up (the `turbine-runup` snapshot, ~2975 rpm, breaker open) to a closed generator breaker:
// hold mode on, so the PID takes the speed to the 3000 rpm setpoint, then the operator closes the breaker as soon as
// the speed is within the breaker margin (±2 rpm). The loop operator's holds keep running.
const closeBreakerWhenInSync = ({ Turbine }: PowerPlantState): PowerPlantAction[] =>
  Turbine.holdMode && !Turbine.generatorBreaker && isAtSyncSpeed(Turbine.rpm) ? [{ type: "TOGGLE_GENERATOR_BREAKER" }] : []

export function syncOperator(state: PowerPlantState, time: number): PowerPlantAction[] {
  return [...holdLoop(state, time), ...closeBreakerWhenInSync(state)]
}

export const turbineSync: Scenario = {
  name: "turbine-sync",
  description: "From the turbine-runup snapshot: hold mode on, speed to the 3000 rpm setpoint, then the generator breaker closes",
  duration: 1200,
  sampleEvery: 10,
  initial: loadSnapshot("turbine-runup"),
  actions: [{ at: 0, action: { type: "TOGGLE_HOLD_MODE" } }],
  operator: syncOperator,
}
