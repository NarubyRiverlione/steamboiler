import { describe, expect, test } from "vitest"
import { CstSimulation } from "../../src/context/const"
import { runScenarioWithLifts } from "../scenario"
import { GasOffAt, reliefLift } from "../scenarios/relief-lift"

const { CstBoiler } = CstSimulation

describe("relief-lift", () => {
  const { samples, lifts } = runScenarioWithLifts(reliefLift)

  test("records the one lift with its open and close time, though it is shorter than a sample", () => {
    expect(lifts).toHaveLength(1)
    const [lift] = lifts
    // Full gas reaches 178 bar after about 4.3 minutes (the deaerator let-down draw delays it, #119) (the knob takes 40 s to bring the gas up, #15). The knob goes down
    // before that and the gas takes 40 s to come off, so the pressure still peaks on the heat in the water and lifts once
    expect(lift.open).toBeGreaterThan(230)
    expect(lift.open).toBeGreaterThan(GasOffAt)
    expect(lift.close).toBeGreaterThan(lift.open)
    expect(lift.close).toBeLessThan(GasOffAt + CstBoiler.MaxGasFlow / CstBoiler.GasRateMax)
  })

  test("the lift vents what the totalizer counts", () => {
    expect(lifts[0].vented).toBeCloseTo(samples[samples.length - 1].state.Boiler.ventedTotal, 6)
  })

  test("the valve stays shut at working pressure", () => {
    const below = samples.filter((s) => s.state.Boiler.pressure <= 165)
    expect(below.every((s) => !s.state.Boiler.reliefValveOpen)).toBe(true)
  })
})
