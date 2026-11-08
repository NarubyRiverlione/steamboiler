import { describe, expect, test } from "vitest"
import { CstSimulation } from "../../src/context/const"
import { runScenario } from "../scenario"
import { boilerLow } from "../scenarios/boiler-low"

describe("boiler-low", () => {
  // every tick, so no overshoot hides between samples
  const samples = runScenario({ ...boilerLow, sampleEvery: 0.1 })

  test("the relief valve lifts and pressure never exceeds design pressure in any tick", () => {
    expect(samples[samples.length - 1].state.Boiler.reliefLifts).toBeGreaterThan(0)
    expect(Math.max(...samples.map((s) => s.state.Boiler.pressure))).toBeLessThanOrEqual(180)
  })

  // The relief valve vents the boiler towards empty; the burner trip stops the gas before the last litres, which cannot
  // absorb the gas heat, are reached (#33)
  test("the burner trips below the burner low-low level and the boiler never runs dry", () => {
    const tripped = samples.find((s) => s.state.Boiler.burnerTripped)
    expect(tripped).toBeDefined()
    expect(samples[samples.length - 1].state.Boiler.gasFlow).toBe(0)
    // the trip centres the knob that was left fully up, and the burner stays off until the operator turns it up again
    expect(samples[0].state.Boiler.gasRateCommand).toBe(1)
    expect(samples[samples.length - 1].state.Boiler.gasRateCommand).toBe(0)
    expect(Math.min(...samples.map((s) => s.state.Boiler.waterVolume))).toBeGreaterThan(
      CstSimulation.CstBoiler.TotalVolume * CstSimulation.CstBoiler.BurnerLowLowLevel * 0.75,
    )
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
