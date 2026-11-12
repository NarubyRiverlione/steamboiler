import { describe, expect, test } from "vitest"
import { runChecked } from "../scenario-checks"
import { LoadTarget, turbineLoad } from "../scenarios/turbine-load"
import { LoopSettings } from "../scenarios/loop-operator"
import { PressureHoldSettings } from "../scenarios/pressure-hold"
import { CstPhysics, CstSimulation } from "../../src/context/const"
import { hotwellLevel, saturationTemperature } from "../../src/utils/condenserCalculation"
import { ratedOutputMW } from "../../src/utils/turbineCalculations"

const { CstBoiler, CstTurbine } = CstSimulation
const SteadyWindow = 600 // sim-seconds at the end of the run that count as steady
const LevelTolerance = 0.005 // the operator only reacts after the level crosses its deadband edge (measured overshoot 1e-5)

// The one run of the scenario: its invariants and the goal checks below
const { samples } = runChecked(turbineLoad)

describe("turbine-load", () => {
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
    const perSecond: number = (CstTurbine.LoadRate * ratedOutputMW) / 60 // the load rate is a share of rated output
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

  // Whole-plant energy balance over the last 600 s (ADR 0032): fuel heat = stack + electric output + generator and shaft
  // losses + cooling water + boiler heat loss. The boiler and hotwell levels hold and the pressure sits at its target,
  // so storage is nil. The tolerance is 0.5% of the fuel heat (about 2 MW): the pressure and level bands leave a little
  // storage drift, and the shaft loss is the calibrated no-load power at sync speed.
  test("over the last 600 s fuel heat equals stack, electric output, losses, cooling water and boiler heat loss", () => {
    const BalanceTolerance = 0.005 // of the fuel heat
    const { CstCondenser } = CstSimulation
    const mean = (value: (s: (typeof steady)[number]) => number): number =>
      steady.reduce((sum, s) => sum + value(s), 0) / steady.length

    const fuel: number = mean((s) => (s.state.Boiler.gasFlow / 1000) * CstPhysics.GasEnergyDensity) // kW
    const stack: number = mean((s) => (s.state.Boiler.gasFlow / 1000) * CstPhysics.GasEnergyDensity * (1 - s.state.Boiler.boilerEfficiency))
    const electric: number = mean((s) => s.state.Turbine.electricOutput) * 1000
    const generatorLoss: number = (electric / CstTurbine.GeneratorEfficiency) - electric
    const shaftLoss: number =
      (CstTurbine.NoLoadFlowFraction * CstTurbine.RatedSteamFlow * CstTurbine.RatedEnthalpyDrop * CstTurbine.IsentropicEfficiency)
    const coolingWater: number = mean(
      (s) =>
        s.state.Condenser.recirculationPumpValvePosition *
        CstCondenser.RecirculationPump_MaxFlowRate *
        CstPhysics.Water_SpecificHeat *
        (s.state.Condenser.coolingWaterOutletTemperature - CstCondenser.RecirculationPump_IntakeTemperature),
    )
    const heatLoss: number = mean((s) => s.state.Boiler.heatLoss)

    const residual: number = fuel - stack - electric - generatorLoss - shaftLoss - coolingWater - heatLoss
    expect(electric).toBeGreaterThan(100_000)
    expect(Math.abs(residual)).toBeLessThan(BalanceTolerance * fuel)
  })

  // Baseline recorded by #74/#82 in design-basis.md: 31.4% (125.0 MWe over 398 MW of fuel heat) with no extraction heater.
  // The hand estimate for one heater was +1.9 points (#88); stop and report if the plant does not beat the baseline.
  test("over the last 600 s the plant efficiency beats the 31.4% of the plant with no heater by about 1.9 points", () => {
    const BaselineEfficiency = 0.314
    const mean = (value: (s: (typeof steady)[number]) => number): number =>
      steady.reduce((sum, s) => sum + value(s), 0) / steady.length
    const fuel: number = mean((s) => (s.state.Boiler.gasFlow / 1000) * CstPhysics.GasEnergyDensity)
    const electric: number = mean((s) => s.state.Turbine.electricOutput) * 1000
    const gain: number = electric / fuel - BaselineEfficiency
    expect(gain).toBeGreaterThan(0.01)
    expect(gain).toBeLessThan(0.03)
  })

  test("at that load the heater takes steam at about 5 bar and the Return leaves it at about 150 °C", () => {
    const last = steady.at(-1)?.state.Heater
    expect(last?.tapPressure).toBeGreaterThan(4.5)
    expect(last?.tapPressure).toBeLessThan(6)
    expect(last?.returnTemperature).toBeGreaterThan(140)
    expect(last?.returnTemperature).toBeLessThan(160)
  })

  test("at that load the cooling water rise and the terminal temperature difference sit in the sourced bands", () => {
    const { CstCondenser } = CstSimulation
    const last = steady.at(-1)?.state.Condenser
    expect(last).toBeDefined()
    if (!last) return
    const rise: number = last.coolingWaterOutletTemperature - CstCondenser.RecirculationPump_IntakeTemperature
    const terminalDifference: number = saturationTemperature(last.pressure) - last.coolingWaterOutletTemperature
    expect(rise).toBeGreaterThan(5.6)
    expect(rise).toBeLessThan(13.9)
    expect(terminalDifference).toBeGreaterThan(2.8)
    expect(terminalDifference).toBeLessThan(7)
    expect(last.coolingWaterOutletTemperature).toBeLessThan(saturationTemperature(last.pressure))
  })
})
