import { describe, expect, test } from "vitest"
import { runScenarioWithLifts } from "../scenario"
import { GasOffAt, reliefLift } from "../scenarios/relief-lift"

describe("relief-lift", () => {
  const { samples, lifts } = runScenarioWithLifts(reliefLift)

  test("records the one lift with its open and close time, though it is shorter than a sample", () => {
    expect(lifts).toHaveLength(1)
    const [lift] = lifts
    // full gas reaches 178 bar after about 3¾ minutes (229 s from the 35% cold fill); with the gas off the 7 bar blowdown takes seconds
    expect(lift.open).toBeGreaterThan(200)
    expect(lift.open).toBeLessThan(GasOffAt)
    expect(lift.close).toBeGreaterThan(GasOffAt)
    expect(lift.close).toBeLessThan(GasOffAt + 30)
  })

  test("the lift vents what the totalizer counts", () => {
    expect(lifts[0].vented).toBeCloseTo(samples[samples.length - 1].state.Boiler.ventedTotal, 6)
  })

  test("the valve stays shut at working pressure", () => {
    const below = samples.filter((s) => s.state.Boiler.pressure <= 165)
    expect(below.every((s) => !s.state.Boiler.reliefValveOpen)).toBe(true)
  })
})
