import { describe, expect, test } from "vitest"
import { CstSimulation } from "../../src/context/const"
import { netOutputOf } from "../../src/context/AuxiliaryLoad"
import { isBusLive } from "../../src/context/AuxiliaryBus"
import { runChecked } from "../scenario-checks"
import { houseLoadHold, HouseLoadSetpoint, TieOpenAt, TransferAt } from "../scenarios/house-load-hold"

const { SyncRPM, BreakerRPMMargin } = CstSimulation.CstTurbine

describe("house-load-hold", () => {
  const { samples } = runChecked(houseLoadHold)
  const before = samples.filter((s) => s.time < TransferAt)
  const island = samples.filter((s) => s.time > TieOpenAt)

  test("the plant carries the setpoint on the grid supply before the transfer", () => {
    expect(before[before.length - 1].state.Turbine.electricOutput).toBeCloseTo(HouseLoadSetpoint, 6)
    expect(before[before.length - 1].state.gridSupplyBreaker).toBe(true)
  })

  test("goal: the unit aux breaker feeds the bus alone and the generator breaker is open, with the speed in the window", () => {
    for (const { state } of island) {
      expect(state.gridSupplyBreaker).toBe(false)
      expect(state.Turbine.unitAuxBreaker).toBe(true)
      expect(state.Turbine.generatorBreaker).toBe(false)
      expect(Math.abs(state.Turbine.rpm - SyncRPM)).toBeLessThanOrEqual(BreakerRPMMargin)
    }
  })

  test("goal: the generator carries the auxiliary load and net output is 0", () => {
    for (const { state } of island) {
      expect(isBusLive(state)).toBe(true)
      expect(state.Turbine.electricOutput).toBeCloseTo(state.auxiliaryLoad, 1)
      expect(Math.abs(netOutputOf(state))).toBeLessThan(0.05)
      expect(state.Turbine.loadSetpoint).toBe(0)
    }
  })

  test("the synchronised speed mode stays in force, holding sync speed", () => {
    for (const { state } of island) expect(state.Turbine.speedMode).toBe("synchronised")
  })

  test("goal: the pumps keep running", () => {
    const last = island[island.length - 1].state
    expect(last.auxiliaryLoad).toBeGreaterThan(0.3)
    expect(last.Condenser.returnRate).toBeGreaterThan(0)
    expect(last.Oil.headerPressure).toBeGreaterThan(0)
    expect(last.Turbine.turbineTripped).toBe(false)
  })
})
