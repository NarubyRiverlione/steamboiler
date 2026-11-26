import { describe, expect, test } from "vitest"
import { CstSimulation } from "../../src/context/const"
import { runChecked } from "../scenario-checks"
import { houseLoadShort } from "../scenarios/house-load-short"
import { TieOpenAt } from "../scenarios/house-load-hold"

const { SyncRPM, BreakerRPMMargin } = CstSimulation.CstTurbine

describe("house-load-short", () => {
  const { samples } = runChecked(houseLoadShort)
  const after = samples.filter((s) => s.time >= TieOpenAt)
  const opened = after.findIndex((s) => !s.state.Turbine.unitAuxBreaker)

  test("goal: the speed falls out of the window and the unit aux breaker opens, with no trip of its own", () => {
    expect(opened).toBeGreaterThan(0)
    expect(after[opened - 1].state.Turbine.rpm).toBeGreaterThanOrEqual(SyncRPM - BreakerRPMMargin)
    expect(after[opened].state.Turbine.rpm).toBeLessThan(SyncRPM - BreakerRPMMargin)
    expect(after[opened - 1].state.Turbine.turbineTripped).toBe(false)
  })

  test("goal: the bus is dead", () => {
    const last = after[after.length - 1].state
    expect(last.gridSupplyBreaker).toBe(false)
    expect(last.Turbine.unitAuxBreaker).toBe(false)
    expect(last.auxiliaryLoad).toBe(0)
    expect(last.Condenser.returnRate).toBe(0)
  })
})
