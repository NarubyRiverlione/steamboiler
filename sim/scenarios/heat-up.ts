import { makeInitialState } from "../../src/context/PowerPlantReducer"
import PowerPlantAction from "../../src/context/PowerPlantActions"
import PowerPlantState from "../../src/context/PowerPlantState"
import { Scenario } from "../scenario"
import { steerGas } from "./gas"
import { isAdjustTime, startUpVent } from "./steps"

// Cold to working pressure with everything closed, the operator ramping the gas at the heating-rate limit:
// the realistic startup pace (see docs/plant/design-basis.md). Decided from state and time alone.

export const RampSettings = {
  RateTarget: 0.017, // K/s on the smoothed heating rate, a margin below the 100 K/h (0.028 K/s) limit for the readout's lag
  PressureTarget: 165, // bar, working pressure: gas off, the closed drum then holds it for hours
  GasStep: 4, // liters/second per adjustment, small enough that the lagging readout (30 s) doesn't overshoot the 100 K/h limit
  GasBackOff: 30, // liters/second per adjustment when over the target: backing off is quicker than creeping up
  AdjustEvery: 1, // sim-seconds between gas adjustments
}

const S = RampSettings

// At working pressure the knob goes fully down; below it the gas is steered up by a step while the smoothed rate is under
// the target, down by a step above it, each reached over one adjustment interval
export function rampOperator(state: PowerPlantState, time: number): PowerPlantAction[] {
  const { Boiler } = state
  const vent: PowerPlantAction[] = startUpVent(state, time)
  if (Boiler.pressure >= S.PressureTarget) return [...vent, ...steerGas(Boiler, 0, S.AdjustEvery)]
  if (!isAdjustTime(time, S.AdjustEvery)) return vent
  const step: number = Boiler.heatingRate < S.RateTarget ? S.GasStep : -S.GasBackOff
  return [...vent, ...steerGas(Boiler, Boiler.gasFlow + step, S.AdjustEvery)]
}

export const heatUpAtLimit: Scenario = {
  name: "heat-up",
  description: "Cold to working pressure (165 bar), gas ramped at the heating-rate limit, everything else closed",
  duration: 25200,
  sampleEvery: 60,
  initial: makeInitialState(),
  actions: [],
  operator: rampOperator,
}
