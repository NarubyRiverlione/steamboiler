import { CstSimulation } from "../../src/context/const"
import { makeInitialState } from "../../src/context/PowerPlantReducer"
import PowerPlantAction from "../../src/context/PowerPlantActions"
import PowerPlantState, { BoilerState } from "../../src/context/PowerPlantState"
import { Scenario } from "../scenario"
import { steerGas } from "./gas"
import { isAdjustTime, startUpVent } from "./steps"

// Cold to working pressure with everything closed, the operator ramping the gas at the heating-rate limit:
// the realistic startup pace (see docs/plant/design-basis.md). Decided from state and time alone.

export const RampSettings = {
  RateShare: 0.6, // share of the heating-rate limit the operator steers to; at 90% the let-down valve closing when the deaerator reaches 3 bar (~8888 s) removes ~12 MW of steam draw in 0.3 s and jumps the rate (#103, #130)
  PressureTarget: 165, // bar, working pressure: gas off, the closed drum then holds it for hours
  GasStep: 4, // liters/second per adjustment, small enough that the lagging readout (30 s) doesn't overshoot the 100 K/h limit
  GasBackOff: 30, // liters/second per adjustment when over the target: backing off is quicker than creeping up
  AdjustEvery: 1, // sim-seconds between gas adjustments
}

const S = RampSettings

// The smoothed heating rate the operator steers to (K/s): a share of the limit
export const RateTarget: number = S.RateShare * CstSimulation.CstBoiler.HeatingRateLimit

// The operator's hand on the knob while heating: the gas is steered up a step while the smoothed rate is under the
// target, down by a larger step above it, each reached over one adjustment interval; nothing between adjustments
export function steerHeatingRate(boiler: BoilerState, time: number): PowerPlantAction[] {
  if (!isAdjustTime(time, S.AdjustEvery)) return []
  const step: number = boiler.heatingRate < RateTarget ? S.GasStep : -S.GasBackOff
  return steerGas(boiler, boiler.gasFlow + step, S.AdjustEvery)
}

// At working pressure the knob goes fully down; below it the gas follows the heating rate
export function rampOperator(state: PowerPlantState, time: number): PowerPlantAction[] {
  const { Boiler } = state
  const vent: PowerPlantAction[] = startUpVent(state, time)
  if (Boiler.pressure >= S.PressureTarget) return [...vent, ...steerGas(Boiler, 0, S.AdjustEvery)]
  return [...vent, ...steerHeatingRate(Boiler, time)]
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
