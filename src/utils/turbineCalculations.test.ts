import { describe, expect, test } from "vitest"
import { CstSimulation } from "../context/const"
import { calculateElectricityOutput, isAtSyncSpeed } from "./turbineCalculations"

const { CstTurbine } = CstSimulation

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
  test("produces power only with the breaker closed at sync speed", () => {
    const expected = 0.5 * CstTurbine.MaxSteamRemovalRate * CstTurbine.steamToElectricityEfficiency
    expect(calculateElectricityOutput(0.5, CstTurbine.SyncRPM, true)).toBe(expected)
    expect(calculateElectricityOutput(0.5, CstTurbine.SyncRPM, false)).toBe(0)
    expect(calculateElectricityOutput(0.5, CstTurbine.MaxRPM, true)).toBe(0)
  })
})
