import { describe, expect, test } from "vitest"
import { CstSimulation } from "../../src/context/const"
import { runChecked } from "../scenario-checks"
import { loadRejection, RejectionLoad, RejectionOpenAt } from "../scenarios/load-rejection"

const { SyncRPM, BreakerRPMMargin, MaxRPM } = CstSimulation.CstTurbine

describe("load-rejection", () => {
  const { samples } = runChecked(loadRejection)
  const before = samples.filter((s) => s.time < RejectionOpenAt)
  const after = samples.filter((s) => s.time >= RejectionOpenAt)
  const opened = after.findIndex((s) => !s.state.Turbine.unitAuxBreaker)

  test("the plant carries the full load on the grid before the generator breaker opens", () => {
    expect(before[before.length - 1].state.Turbine.electricOutput).toBeCloseTo(RejectionLoad, 6)
  })

  test("goal: the speed leaves the window upwards and the unit aux breaker opens", () => {
    expect(opened).toBeGreaterThan(0)
    expect(after[opened - 1].state.Turbine.rpm).toBeLessThan(SyncRPM + BreakerRPMMargin)
    expect(after[opened].state.Turbine.rpm).toBeGreaterThan(SyncRPM + BreakerRPMMargin)
  })

  test("goal: the bus is dead and the pumps stop", () => {
    const last = after[after.length - 1].state
    expect(last.gridSupplyBreaker).toBe(false)
    expect(last.Turbine.generatorBreaker).toBe(false)
    expect(last.Turbine.unitAuxBreaker).toBe(false)
    expect(last.auxiliaryLoad).toBe(0)
    expect(last.Condenser.returnRate).toBe(0)
  })

  test("goal: the overspeed trip does not act (the peak stays under the limit); the turbine trips on the vacuum limit", () => {
    expect(Math.max(...after.map((s) => s.state.Turbine.rpm))).toBeLessThan(MaxRPM)
    expect(after[after.length - 1].state.Turbine.turbineTripped).toBe(true)
  })
})
