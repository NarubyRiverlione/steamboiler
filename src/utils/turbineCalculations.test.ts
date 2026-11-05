import { describe, expect, test } from "vitest"
import { CstSimulation } from "../context/const"
import { getIsentropicEnthalpyDrop } from "./steamTable"
import {
  calculateElectricityOutput,
  calculateRPM,
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

describe("calculateRPM", () => {
  const { SyncRPM, RatedSteamFlow, RatedEnthalpyDrop, NoLoadFlowFraction } = CstTurbine
  const dt: number = CstSimulation.DeltaTime

  // Hand calculation, one tick from standstill with 10 kg/s at 900 kJ/kg:
  //   P = 10 x 900e3 x 0.85 = 7.65 MW;  T = P / ω_s x (2 − 0) = 7.65e6 / 314.159 x 2 = 48 701 N·m (losses 0 at rest)
  //   S = 171 x 917e3 x 0.85 x 0.98 = 130.62 MW;  J = 2 x 4 x S / ω_s² = 10 587 kg·m²
  //   Δω = T / J x 0.1 s = 0.4600 rad/s = 4.393 rpm
  test("hand-calculated first tick from standstill", () => {
    expect(calculateRPM(0, 10, 900)).toBeCloseTo(4.393, 2)
  })

  test("the no-load flow holds sync speed: no acceleration at 3000 rpm", () => {
    const noLoadFlow: number = NoLoadFlowFraction * RatedSteamFlow
    expect(calculateRPM(SyncRPM, noLoadFlow, RatedEnthalpyDrop)).toBeCloseTo(SyncRPM, 6)
  })

  test("more than the no-load flow accelerates, less decelerates", () => {
    const noLoadFlow: number = NoLoadFlowFraction * RatedSteamFlow
    expect(calculateRPM(SyncRPM, noLoadFlow * 2, RatedEnthalpyDrop)).toBeGreaterThan(SyncRPM)
    expect(calculateRPM(SyncRPM, noLoadFlow / 2, RatedEnthalpyDrop)).toBeLessThan(SyncRPM)
  })

  test("with no steam the rotor coasts down and never goes below 0 rpm", () => {
    expect(calculateRPM(SyncRPM, 0, RatedEnthalpyDrop)).toBeLessThan(SyncRPM)
    expect(calculateRPM(0, 0, RatedEnthalpyDrop)).toBe(0)
    expect(calculateRPM(0.001, 0, RatedEnthalpyDrop)).toBeGreaterThanOrEqual(0)
  })

  test("a non-positive enthalpy drop gives no drive", () => {
    expect(calculateRPM(0, 10, -50)).toBe(0)
  })

  test("free acceleration to sync speed takes minutes at the rated flow, not hours", () => {
    let rpm = 0
    let seconds = 0
    while (rpm < SyncRPM && seconds < 3600) {
      rpm = calculateRPM(rpm, 10, RatedEnthalpyDrop)
      seconds += dt
    }
    // KE at sync = 0.5 J ω_s² = H x S = 523 MJ; at 10 kg/s the shaft power is 7.8 MW, ~1.5x on average
    expect(seconds).toBeGreaterThan(20)
    expect(seconds).toBeLessThan(300)
  })

  // Without losses J·dω/dt = (P/ω_s)(2 − ω/ω_s) gives ω = 2ω_s(1 − e^(−t/τ)), τ = J·ω_s²/P, so sync speed
  // is reached at t = τ·ln 2. At the rated flow the loss (4 MW of 133 MW) is small enough to compare within 10%.
  test("free acceleration at the rated flow takes the time that follows from J and P", () => {
    const omegaSync: number = (2 * Math.PI * SyncRPM) / 60
    const shaftPower: number = RatedSteamFlow * RatedEnthalpyDrop * 1000 * CstTurbine.IsentropicEfficiency
    const ratedOutput: number = shaftPower * CstTurbine.GeneratorEfficiency
    const inertia: number = (2 * CstTurbine.InertiaConstant * ratedOutput) / omegaSync ** 2
    const expected: number = ((inertia * omegaSync ** 2) / shaftPower) * Math.LN2
    let rpm = 0
    let seconds = 0
    while (rpm < SyncRPM) {
      rpm = calculateRPM(rpm, RatedSteamFlow, RatedEnthalpyDrop)
      seconds += dt
    }
    expect(Math.abs(seconds - expected)).toBeLessThan(expected * 0.1)
  })

  test("the no-load flow holds sync speed at the plant's own drop (165 bar, 13 mbar) when scaled by 1/drop", () => {
    const drop: number = getIsentropicEnthalpyDrop(165, 0.0133)
    const flow: number = (NoLoadFlowFraction * RatedSteamFlow * RatedEnthalpyDrop) / drop
    expect(calculateRPM(SyncRPM, flow, drop)).toBeCloseTo(SyncRPM, 6)
  })

  test("RatedEnthalpyDrop matches the steam table at 165 bar and 100 mbar", () => {
    expect(Math.abs(getIsentropicEnthalpyDrop(165, 0.1) - RatedEnthalpyDrop)).toBeLessThan(RatedEnthalpyDrop * 0.005)
  })
})
