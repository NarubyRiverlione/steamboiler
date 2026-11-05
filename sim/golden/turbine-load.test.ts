import { describe, expect, test } from "vitest"
import { runScenario } from "../scenario"
import { turbineLoad } from "../scenarios/turbine-load"
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

  test("the generator carries load throughout: positive MW with the breaker closed", () => {
    for (const { state } of samples) {
      expect(state.Turbine.generatorBreaker).toBe(true)
      expect(state.Turbine.electricOutput).toBeGreaterThan(0)
    }
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
