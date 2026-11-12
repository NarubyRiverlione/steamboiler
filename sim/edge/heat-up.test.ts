import { describe, expect, test } from "vitest"
import { firstTimeWhere, runScenario } from "../scenario"
import { heatUpAtLimit } from "../scenarios/heat-up"

describe("heat-up", () => {
  // every second: the rate is smoothed over 30 s, so no alarm hides between samples
  const samples = runScenario({ ...heatUpAtLimit, sampleEvery: 1 })

  test("ramped at the limit, reaches working pressure (165 bar) in 4 to 8 hours, the real cold start", () => {
    const reached = firstTimeWhere(samples, (s) => s.Boiler.pressure >= 165) ?? Infinity
    expect(reached).toBeGreaterThanOrEqual(4 * 3600)
    expect(reached).toBeLessThanOrEqual(8 * 3600)
  })

  test("never raises the heating-rate alarm", () => {
    expect(samples.filter((s) => s.state.Boiler.heatingRateOverLimit).map((s) => s.time)).toEqual([])
  })

  test("the relief valve stays shut", () => {
    expect(samples.at(-1)?.state.Boiler.reliefLifts).toBe(0)
  })
})
