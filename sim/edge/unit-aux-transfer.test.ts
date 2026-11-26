import { describe, expect, test } from "vitest"
import { CstSimulation } from "../../src/context/const"
import { isBusLive } from "../../src/context/AuxiliaryBus"
import { netOutputOf } from "../../src/context/AuxiliaryLoad"
import { runChecked } from "../scenario-checks"
import { TransferBackAt, TransferOutAt, unitAuxTransfer } from "../scenarios/unit-aux-transfer"

const { SyncRPM, BreakerRPMMargin } = CstSimulation.CstTurbine

describe("unit-aux-transfer", () => {
  const { samples } = runChecked(unitAuxTransfer)
  const onUnitAux = samples.filter((s) => s.time > TransferOutAt && s.time < TransferBackAt)

  test("goal: the bus is never dead and the pumps never stop, through both transfers", () => {
    for (const { state } of samples) {
      expect(isBusLive(state)).toBe(true)
      expect(state.auxiliaryLoad).toBeGreaterThan(0.3)
      expect(state.Oil.headerPressure).toBeGreaterThan(0)
      expect(state.Turbine.turningGearEngaged).toBe(false)
    }
    expect(samples[samples.length - 1].state.Condenser.returnRate).toBeGreaterThan(0)
  })

  test("goal: the grid supply and the unit aux breaker are never closed together", () => {
    for (const { state } of samples) expect(state.gridSupplyBreaker && state.Turbine.unitAuxBreaker).toBe(false)
  })

  test("the unit aux breaker feeds the bus between the transfers, and the grid supply before and after", () => {
    expect(samples[0].state.gridSupplyBreaker).toBe(true)
    for (const { state } of onUnitAux) expect(state.Turbine.unitAuxBreaker).toBe(true)
    expect(samples[samples.length - 1].state.gridSupplyBreaker).toBe(true)
    expect(samples[samples.length - 1].state.Turbine.unitAuxBreaker).toBe(false)
  })

  test("the generator stays tied to the grid, exports gross minus the auxiliary load and holds the speed in the window", () => {
    for (const { state } of onUnitAux) {
      expect(state.Turbine.generatorBreaker).toBe(true)
      expect(netOutputOf(state)).toBeCloseTo(state.Turbine.electricOutput - state.auxiliaryLoad, 9)
      expect(Math.abs(state.Turbine.rpm - SyncRPM)).toBeLessThanOrEqual(BreakerRPMMargin)
    }
  })
})
