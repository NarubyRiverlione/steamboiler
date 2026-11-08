import { makeInitialState } from "../../src/context/PowerPlantReducer"
import PowerPlantAction from "../../src/context/PowerPlantActions"
import PowerPlantState from "../../src/context/PowerPlantState"
import { Scenario } from "../scenario"
import { steerGas } from "./gas"
import { isAdjustTime } from "./steps"

// Cold to working pressure with everything closed, the operator ramping the gas at the heating-rate limit:
// the realistic startup pace (see docs/plant/design-basis.md). Decided from state and time alone.

export const RampSettings = {
  RateTarget: 0.36, // K/s on the smoothed heating rate, a margin below the 0.4 K/s limit for the readout's lag
  PressureTarget: 165, // bar, working pressure: gas off, the closed drum then holds it for hours
  GasStep: 20, // liters/second per adjustment, small enough that the lagging readout doesn't overshoot
  AdjustEvery: 1, // sim-seconds between gas adjustments
}

const S = RampSettings

// At working pressure the knob goes fully down; below it the gas is steered up by a step while the smoothed rate is under
// the target, down by a step above it, each reached over one adjustment interval
export function rampOperator({ Boiler }: PowerPlantState, time: number): PowerPlantAction[] {
  if (Boiler.pressure >= S.PressureTarget) return steerGas(Boiler, 0, S.AdjustEvery)
  if (!isAdjustTime(time, S.AdjustEvery)) return []
  const step: number = Boiler.heatingRate < S.RateTarget ? S.GasStep : -S.GasStep
  return steerGas(Boiler, Boiler.gasFlow + step, S.AdjustEvery)
}

export const heatUpAtLimit: Scenario = {
  name: "heat-up",
  description: "Cold to working pressure (165 bar), gas ramped at the heating-rate limit, everything else closed",
  duration: 1200,
  sampleEvery: 10,
  initial: makeInitialState(),
  actions: [],
  operator: rampOperator,
}
