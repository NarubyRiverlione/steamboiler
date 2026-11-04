import { describe, expect, test } from "vitest"
import { CstSimulation } from "../context/const"
import {
  calculateElectricityOutput,
  isAboveVacuumLimit,
  isAtSyncSpeed,
  maxTurbineValvePosition,
  turbineTrippedAfter,
} from "./turbineCalculations"

const { CstCondenser, CstTurbine } = CstSimulation

describe("isAtSyncSpeed", () => {
  test("true within the breaker margin of sync speed", () => {
    const margin = CstTurbine.BreakerRPMMargin
    expect(isAtSyncSpeed(CstTurbine.SyncRPM)).toBe(true)
    expect(isAtSyncSpeed(CstTurbine.SyncRPM - margin)).toBe(true)
    expect(isAtSyncSpeed(CstTurbine.SyncRPM + margin)).toBe(true)
  })

  test("false outside the margin and at the overspeed limit", () => {
    const margin = CstTurbine.BreakerRPMMargin
    expect(isAtSyncSpeed(CstTurbine.SyncRPM - margin - 1)).toBe(false)
    expect(isAtSyncSpeed(CstTurbine.SyncRPM + margin + 1)).toBe(false)
    expect(isAtSyncSpeed(CstTurbine.MaxRPM)).toBe(false)
  })
})

describe("calculateElectricityOutput", () => {
  const atSync = CstTurbine.SyncRPM

  test("hand-calculated case: 100 kg/s x 1000 kJ/kg x 0.85 x 0.98 / 1000 = 83.3 MW", () => {
    expect(calculateElectricityOutput(100, 1000, atSync, true)).toBeCloseTo(83.3, 6)
  })

  test("is zero with the breaker open or off sync speed", () => {
    expect(calculateElectricityOutput(100, 1000, atSync, false)).toBe(0)
    expect(calculateElectricityOutput(100, 1000, CstTurbine.MaxRPM, true)).toBe(0)
  })

  test("is zero with no flow and clamped at zero for a non-positive enthalpy drop", () => {
    expect(calculateElectricityOutput(0, 1000, atSync, true)).toBe(0)
    expect(calculateElectricityOutput(100, 0, atSync, true)).toBe(0)
    expect(calculateElectricityOutput(100, -50, atSync, true)).toBe(0)
  })
})

describe("vacuum limit", () => {
  const limit = CstCondenser.VacuumLimit

  test("isAboveVacuumLimit is one-sided: at or below the limit is allowed", () => {
    expect(isAboveVacuumLimit(limit + 0.1)).toBe(true)
    expect(isAboveVacuumLimit(limit)).toBe(false)
    expect(isAboveVacuumLimit(13)).toBe(false)
  })

  test("above the limit the turbine valve may not open past where it is", () => {
    expect(maxTurbineValvePosition(0.3, limit + 1)).toBe(0.3)
    expect(maxTurbineValvePosition(0.3, limit)).toBe(1)
  })

  test("the trip flag clears on an opening and stays on otherwise", () => {
    expect(turbineTrippedAfter(true, 0, 0.01)).toBe(false)
    expect(turbineTrippedAfter(true, 0.2, 0.2)).toBe(true)
    expect(turbineTrippedAfter(true, 0.2, 0.1)).toBe(true)
    expect(turbineTrippedAfter(false, 0, 0.5)).toBe(false)
  })
})
