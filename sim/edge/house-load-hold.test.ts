import { describe, expect, test } from "vitest"
import { CstSimulation } from "../../src/context/const"
import { netOutputOf } from "../../src/context/AuxiliaryLoad"
import { isBusLive } from "../../src/context/AuxiliaryBus"
import { runChecked } from "../scenario-checks"
import { houseLoadHold, LoadSetpoint, OpenAt } from "../scenarios/house-load-hold"

const { SyncRPM, BreakerRPMMargin } = CstSimulation.CstTurbine

describe("house-load-hold", () => {
  const { samples } = runChecked(houseLoadHold)
  const before = samples.filter((s) => s.time < OpenAt)
  const island = samples.filter((s) => s.time > OpenAt)

  test("the plant carries the setpoint on the grid before the tie opens", () => {
    expect(before[before.length - 1].state.Turbine.electricOutput).toBeCloseTo(LoadSetpoint, 6)
    expect(before[before.length - 1].state.gridSupplyBreaker).toBe(true)
  })

  test("goal: the generator breaker stays closed and the speed stays in the window", () => {
    for (const { state } of island) {
      expect(state.gridSupplyBreaker).toBe(false)
      expect(state.Turbine.generatorBreaker).toBe(true)
      expect(Math.abs(state.Turbine.rpm - SyncRPM)).toBeLessThanOrEqual(BreakerRPMMargin)
    }
  })

  test("goal: the generator carries the auxiliary load and net output is 0; the setpoint is kept", () => {
    for (const { state } of island) {
      expect(isBusLive(state)).toBe(true)
      expect(state.Turbine.electricOutput).toBeCloseTo(state.auxiliaryLoad, 1)
      expect(Math.abs(netOutputOf(state))).toBeLessThan(0.05)
      expect(state.Turbine.loadSetpoint).toBe(LoadSetpoint)
    }
  })

  test("goal: the pumps keep running", () => {
    const last = island[island.length - 1].state
    expect(last.auxiliaryLoad).toBeGreaterThan(0.3)
    expect(last.Condenser.returnRate).toBeGreaterThan(0)
    expect(last.Oil.headerPressure).toBeGreaterThan(0)
    expect(last.Turbine.turbineTripped).toBe(false)
  })
})
