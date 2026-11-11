import { describe, expect, test } from "vitest"
import { CstSimulation } from "../context/const"
import { makeInitialState } from "../context/PowerPlantReducer"
import { getIsentropicEnthalpyDrop } from "./steamTable"
import {
  calculateRPM,
  generatorFrequency,
  isAboveVacuumLimit,
  isAtSyncSpeed,
  isAtOverspeed,
  loadAfter,
  loadSetpointRefusal,
  maxTurbineValvePosition,
  ratedOutputMW,
  shaftWorkFraction,
  turbineTrippedAfter,
} from "./turbineCalculations"

const { CstCondenser, CstTurbine } = CstSimulation

describe("generatorFrequency", () => {
  test("is 50 Hz at sync speed and 0 Hz at standstill", () => {
    expect(generatorFrequency(CstTurbine.SyncRPM)).toBe(50)
    expect(generatorFrequency(0)).toBe(0)
  })

  test("follows the shaft speed linearly", () => {
    expect(generatorFrequency(1500)).toBe(25)
  })
})

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

describe("shaftWorkFraction", () => {
  test("is 0 at standstill and 1 at sync speed", () => {
    expect(shaftWorkFraction(0)).toBe(0)
    expect(shaftWorkFraction(CstTurbine.SyncRPM)).toBe(1)
  })

  test("is the torque shape x(2 - x): 0.75 at half speed", () => {
    expect(shaftWorkFraction(CstTurbine.SyncRPM / 2)).toBeCloseTo(0.75, 9)
  })

  test("stays within 0-1 above sync speed and at overspeed", () => {
    expect(shaftWorkFraction(CstTurbine.MaxRPM)).toBeLessThanOrEqual(1)
    expect(shaftWorkFraction(2 * CstTurbine.SyncRPM + 100)).toBe(0)
  })
})

describe("ratedOutputMW", () => {
  test("is the 141.9 MW of the rated flow, the 31 mbar design vacuum and the extraction steam that stops working at the tap (ADR 0031)", () => {
    // 192 kg/s x 0.85 x 0.98 x the drop that does work: 1016 kJ/kg less the extracted share (about a quarter: the deaerator tap and the heater) of what is below
    // the tap; with no extraction it would be 162.5 MW
    expect(ratedOutputMW).toBeCloseTo(141.9, 1)
  })

  test("RatedSteamFlow is the measured 192 kg/s: re-derive it from max-output if the plant changes (ADR 0031)", () => {
    expect(CstTurbine.RatedSteamFlow).toBe(192)
    expect(CstTurbine.RatedSteamFlow).toBeLessThan(CstTurbine.MaxSteamRemovalRate)
  })

  test("is less than the same flow would give with no extraction", () => {
    const noExtraction: number =
      (CstTurbine.RatedSteamFlow * CstTurbine.RatedEnthalpyDrop * 1000 * CstTurbine.IsentropicEfficiency * CstTurbine.GeneratorEfficiency) / 1e6
    expect(ratedOutputMW).toBeLessThan(noExtraction)
  })
})

describe("loadAfter", () => {
  const step: number = (CstTurbine.LoadRate * ratedOutputMW * CstSimulation.DeltaTime) / 60

  test("moves toward the setpoint at the load rate, up and down", () => {
    expect(loadAfter(10, 100)).toBeCloseTo(10 + step, 9)
    expect(loadAfter(10, 0)).toBeCloseTo(10 - step, 9)
  })

  test("the rate is 3% of rated output per minute", () => {
    let load = 0
    for (let i = 0; i < 600; i++) load = loadAfter(load, ratedOutputMW)
    expect(load).toBeCloseTo(0.03 * ratedOutputMW, 6)
  })

  test("stops at the setpoint without overshoot", () => {
    expect(loadAfter(5, 5 + step / 2)).toBe(5 + step / 2)
    expect(loadAfter(5 + step / 2, 5)).toBe(5)
    expect(loadAfter(7, 7)).toBe(7)
  })
})

describe("loadSetpointRefusal", () => {
  const turbine = makeInitialState().Turbine

  test("refused with the breaker open, with a reason", () => {
    expect(loadSetpointRefusal({ ...turbine, generatorBreaker: false })).toBeTypeOf("string")
  })

  test("allowed with the breaker closed, in any speed mode", () => {
    for (const speedMode of ["free", "rampUp", "hold"] as const)
      expect(loadSetpointRefusal({ ...turbine, generatorBreaker: true, speedMode })).toBeUndefined()
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
  //   S = 161 x 917e3 x 0.85 x 0.98 = 122.97 MW;  J = 2 x 4 x S / ω_s² = 9 967 kg·m²
  //   Δω = T / J x 0.1 s = 0.4886 rad/s = 4.665 rpm
  test("hand-calculated first tick from standstill", () => {
    // J scales with the rated output (141.9 MW since the deaerator, #119; 141.3 MW with the heater alone, ADR 0031; 4.292 at 133.7 MW, 4.665 at 123.0 MW)
    expect(calculateRPM(0, 10, 900)).toBeCloseTo(4.043, 2)
  })

  // Load power at sync speed: the generator draws load / efficiency from the shaft, so the steam must cover the
  // losses plus that. 10 MW of load needs 10 / 0.98 MW on top of the no-load shaft power
  test("a load takes shaft power: the no-load flow no longer holds sync speed", () => {
    const noLoadFlow: number = NoLoadFlowFraction * RatedSteamFlow
    expect(calculateRPM(SyncRPM, noLoadFlow, RatedEnthalpyDrop, 10)).toBeLessThan(SyncRPM)
  })

  test("the steam for losses plus load/efficiency holds sync speed", () => {
    const loadMW = 50
    const shaftPerKgPerS: number = (RatedEnthalpyDrop * 1000 * CstTurbine.IsentropicEfficiency)
    const flow: number = NoLoadFlowFraction * RatedSteamFlow + (loadMW * 1e6) / CstTurbine.GeneratorEfficiency / shaftPerKgPerS
    expect(calculateRPM(SyncRPM, flow, RatedEnthalpyDrop, loadMW)).toBeCloseTo(SyncRPM, 6)
  })

  test("a load never gives NaN or a negative speed, even at standstill", () => {
    expect(calculateRPM(0, 0, RatedEnthalpyDrop, 50)).toBe(0)
    expect(calculateRPM(0.001, 0, RatedEnthalpyDrop, 130)).toBeGreaterThanOrEqual(0)
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
    const ratedOutput: number = ratedOutputMW * 1e6
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

  test("RatedEnthalpyDrop matches the steam table at 165 bar and the 31 mbar design vacuum", () => {
    expect(Math.abs(getIsentropicEnthalpyDrop(165, 0.031) - RatedEnthalpyDrop)).toBeLessThan(RatedEnthalpyDrop * 0.005)
  })
})

describe("overspeed limit", () => {
  const limit = CstTurbine.MaxRPM

  test("isAtOverspeed is true at the limit and above, false just below", () => {
    expect(isAtOverspeed(limit)).toBe(true)
    expect(isAtOverspeed(limit + 0.1)).toBe(true)
    expect(isAtOverspeed(limit - 0.1)).toBe(false)
    expect(isAtOverspeed(0)).toBe(false)
  })
})
