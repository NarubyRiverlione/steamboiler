import { describe, expect, test } from "vitest"
import { runScenario } from "../scenario"
import { LoadTarget, turbineLoad } from "../scenarios/turbine-load"
import { LoopSettings } from "../scenarios/loop-operator"
import { PressureHoldSettings } from "../scenarios/pressure-hold"
import { CstSimulation } from "../../src/context/const"
import { hotwellLevel } from "../../src/utils/condenserCalculation"

const { CstBoiler, CstTurbine } = CstSimulation
const SteadyWindow = 600 // sim-seconds at the end of the run that count as steady
const LevelTolerance = 0.005 // the operator only reacts after the level crosses its deadband edge (measured overshoot 1e-5)

describe("turbine-load", () => {
  const samples = runScenario(turbineLoad)
  const steady = samples.filter((s) => s.time >= turbineLoad.duration - SteadyWindow)

  test("starts synchronised with the breaker closed", () => {
    const { Turbine } = samples[0].state
    expect(Turbine.generatorBreaker).toBe(true)
    expect(Math.abs(Turbine.rpm - CstTurbine.SyncRPM)).toBeLessThanOrEqual(CstTurbine.BreakerRPMMargin)
  })

  test("the speed stays within ±2 rpm throughout and the breaker never opens", () => {
    for (const { state } of samples) {
      expect(state.Turbine.generatorBreaker).toBe(true)
      expect(Math.abs(state.Turbine.rpm - CstTurbine.SyncRPM)).toBeLessThanOrEqual(CstTurbine.BreakerRPMMargin)
    }
  })

  test("the electric output is the load carried: it climbs at the load rate and reaches the setpoint", () => {
    const perSecond: number = (CstTurbine.LoadRate * LoadTarget) / 60
    for (const { time, state } of samples) {
      expect(state.Turbine.loadSetpoint).toBe(LoadTarget)
      expect(state.Turbine.electricOutput).toBeLessThanOrEqual(Math.min(LoadTarget, perSecond * (time + 1)) + 1e-9)
      expect(state.Turbine.electricOutput).toBeGreaterThanOrEqual(Math.min(LoadTarget, perSecond * (time - 1)) - 1e-9)
    }
    expect(samples.at(-1)?.state.Turbine.electricOutput).toBeCloseTo(LoadTarget, 6)
  })

  test("over the last 600 s boiler pressure holds the band", () => {
    const { Target, Band } = PressureHoldSettings
    for (const { state } of steady) expect(Math.abs(state.Boiler.pressure - Target)).toBeLessThanOrEqual(Band)
  })

  test("over the last 600 s the boiler level and the hotwell level hold their bands", () => {
    const { BoilerLevelTarget, BoilerLevelBand, HotwellBandLow, HotwellBandHigh, HotwellRamp } = LoopSettings
    for (const { state } of steady) {
      expect(Math.abs(state.Boiler.waterVolume / CstBoiler.TotalVolume - BoilerLevelTarget)).toBeLessThanOrEqual(
        BoilerLevelBand + LevelTolerance,
      )
      const level = hotwellLevel(state.Condenser.hotwellWaterVolume)
      expect(level).toBeGreaterThanOrEqual(HotwellBandLow - HotwellRamp / 10)
      expect(level).toBeLessThanOrEqual(HotwellBandHigh + HotwellRamp / 10)
    }
  })

  test("over the last 600 s the speed holds sync, the breaker stays closed and the relief valve never lifts", () => {
    for (const { state } of steady) {
      expect(state.Turbine.generatorBreaker).toBe(true)
      expect(Math.abs(state.Turbine.rpm - CstTurbine.SyncRPM)).toBeLessThanOrEqual(CstTurbine.BreakerRPMMargin)
    }
    expect(samples.at(-1)?.state.Boiler.reliefLifts).toBe(0)
  })
})
