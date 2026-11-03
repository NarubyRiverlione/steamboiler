import { describe, expect, test } from "vitest"
import { runScenario } from "../scenario"
import { boilerLow } from "../scenarios/boiler-low"

describe("boiler-low", () => {
  // every tick, so no overshoot hides between samples
  const samples = runScenario({ ...boilerLow, sampleEvery: 0.1 })

  // As the relief valve vents the boiler dry, its last litre or so cannot absorb the gas heat and the metal heats past
  // design pressure: burner protection on low level is #33
  test("the relief valve lifts and pressure never exceeds design pressure in any tick while 1 m³ of water remains", () => {
    expect(samples[samples.length - 1].state.Boiler.reliefLifts).toBeGreaterThan(0)
    const wet = samples.filter((s) => s.state.Boiler.waterVolume > 1000)
    expect(Math.max(...wet.map((s) => s.state.Boiler.pressure))).toBeLessThanOrEqual(180)
  })

  test("raises the heating-rate alarm: full gas from cold is above the limit", () => {
    expect(samples.some((s) => s.state.Boiler.heatingRateOverLimit)).toBe(true)
  })

  test("no NaN or Infinity in an hour of full gas", () => {
    const values: unknown[] = samples.flatMap((s) =>
      [s.state.Boiler, s.state.Condenser, s.state.Turbine].flatMap((part) => Object.values(part) as unknown[]),
    )
    expect(values.filter((v) => typeof v === "number" && !Number.isFinite(v))).toEqual([])
  })
})
