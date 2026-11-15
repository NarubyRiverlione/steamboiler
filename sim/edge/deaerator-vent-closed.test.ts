import { describe, expect, test } from "vitest"
import { CstDeaerator } from "../../src/context/const"
import { runScenario, Sample } from "../scenario"
import { runChecked } from "../scenario-checks"
import { bypassLoop } from "../scenarios/bypass-loop"
import { deaeratorVentClosed } from "../scenarios/deaerator-vent-closed"

// The cold start with the deaerator start-up vent never opened (#120, ADR 0038). The vent opened and closed on time is
// judged in sim/golden/bypass-loop.test.ts, the vent left open in deaerator-vent-open.test.ts.

const GoalWindow = 900 // sim-seconds: the goal checks judge the start, where the air is; the invariants judge the whole run
const ReferenceAt = 360 // sim-seconds: compared with the vent opened on time

// The relief valve lifts for less than a sample, so the run is sampled every tick
const { samples: run } = runChecked(deaeratorVentClosed, { sampleEvery: 0.1 })
const samples: Sample[] = run.filter((s) => s.time < GoalWindow)
const firstTime = (condition: (s: Sample) => boolean): number | undefined => samples.find(condition)?.time

describe("deaerator vent never opened (deaerator-vent-closed)", () => {
  // The start of bypass-loop, only as long as the comparison needs
  const onTime: Sample[] = runScenario({
    ...bypassLoop,
    duration: ReferenceAt + 40,
    actions: bypassLoop.actions.filter((a) => a.at < ReferenceAt + 40),
  })

  test("the heating lags the saturation: the pressure is above the saturation pressure while the air is there", () => {
    for (const { state } of samples.filter((s) => s.time >= 60)) expect(state.Deaerator.pressure).toBeGreaterThan(state.Deaerator.saturationPressure + 0.9 * state.Deaerator.airPressure)
    const early = samples.find((s) => s.time >= ReferenceAt)?.state.Deaerator
    const reference = onTime.find((s) => s.time >= ReferenceAt)?.state.Deaerator
    expect(early?.pressure).toBeGreaterThan((reference?.pressure ?? Infinity) + 0.5)
  })

  test("the pressure climbs past the setpoint and the 4 bar relief valve lifts, loses steam and takes the air with it", () => {
    const lift: number | undefined = firstTime((s) => s.state.Deaerator.reliefValveOpen)
    expect(lift).toBeDefined()
    // the valve decides on the pressure at the start of the tick, so the sample before the first open one is at or over the lift pressure
    const decided = samples[samples.findIndex((s) => s.time === lift) - 1].state.Deaerator
    expect(decided.pressure).toBeGreaterThanOrEqual(CstDeaerator.ReliefPressure)
    const after = samples.find((s) => s.time >= (lift ?? 0) + 60)?.state.Deaerator
    const before = samples.find((s) => s.time === lift)?.state.Deaerator
    expect(after?.ventedTotal).toBeGreaterThan((before?.ventedTotal ?? Infinity) + 20)
    expect(after?.airMass).toBeLessThan((before?.airMass ?? 0) - 10)
    // no damage: the pressure is held to the lift pressure plus what one tick's steam adds
    expect(Math.max(...samples.map((s) => s.state.Deaerator.pressure))).toBeLessThan(CstDeaerator.ReliefPressure + 0.5)
  })

  test("the warning flag is on while the air is present and the other is off", () => {
    const flagged = samples.filter((s) => s.time >= 60)
    expect(flagged.every((s) => s.state.Deaerator.warnVentClosedWithAir && !s.state.Deaerator.warnVentOpenNoAir)).toBe(true)
  })
})
