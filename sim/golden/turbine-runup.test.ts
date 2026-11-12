import { describe, expect, test } from "vitest"
import { firstTimeWhere, runScenario, runScenarioWithLifts } from "../scenario"
import { LoopSettings } from "../scenarios/loop-operator"
import { PressureHoldSettings } from "../scenarios/pressure-hold"
import { hotwellLevel } from "../../src/utils/condenserCalculation"
import { StartupSettings, startupOperator, turbineRunup } from "../scenarios/turbine-runup"
import { turbineSync } from "../scenarios/turbine-sync"
import { StartGas } from "../scenarios/steps"
import { CstSimulation } from "../../src/context/const"
import PowerPlantState from "../../src/context/PowerPlantState"

const RunUpCheckDuration = 3900 // sim-seconds: the 60 min run-up and the Hold at 3000 rpm that ends it

describe("turbine-runup", () => {
  const { samples, lifts } = runScenarioWithLifts(turbineRunup)

  test("starts cold and at rest", () => {
    expect(samples[0].state.Boiler.temperature).toBe(20)
    expect(samples[0].state.Turbine.rpm).toBe(0)
  })

  const valveOpenAt = firstTimeWhere(samples, (s) => s.Turbine.mainSteamValve) ?? Infinity

  test("heats under the real limit: the heating-rate alarm never rises (#103)", () => {
    expect(samples.filter((s) => s.state.Boiler.heatingRateOverLimit).map((s) => s.time)).toEqual([])
  })

  test("reaches main-steam-valve pressure (10 bar) before the valve is opened, at working pressure (ADR 0018)", () => {
    expect(firstTimeWhere(samples, (s) => s.Boiler.pressure > 10)).toBeLessThan(valveOpenAt)
    // the sample just before: the opening itself starts the pressure falling
    const before = samples.find((s) => s.time >= valveOpenAt - 10)
    expect(before?.state.Boiler.pressure).toBeGreaterThan(PressureHoldSettings.Target - PressureHoldSettings.Band - 0.5)
  })

  test("the turbine spins up only after the main steam valve opens", () => {
    expect(valveOpenAt).toBeLessThan(turbineRunup.duration)
    expect(firstTimeWhere(samples, (s) => s.Turbine.rpm > 0)).toBeGreaterThan(valveOpenAt)
  })

  const { Target, Band } = PressureHoldSettings
  const { SettlingTime } = StartupSettings
  // The bypass crack draws the pressure down from the band, and Ramp up waits until it is back
  const inBandAt = firstTimeWhere(samples, (s) => s.Turbine.speedMode !== "free") ?? Infinity
  const last = samples.filter((s) => s.time >= turbineRunup.duration - SettlingTime)
  const average = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length

  test("cracks the bypass to 5% with the turbine valve shut until the pressure is back in the band", () => {
    expect(inBandAt).toBeLessThan(turbineRunup.duration - SettlingTime)
    for (const { state } of samples.filter((s) => s.time > valveOpenAt && s.time < inBandAt)) {
      expect(state.Turbine.bypassValvePosition).toBeCloseTo(0.05, 9)
      expect(state.Turbine.turbineValvePosition).toBe(0)
      expect(state.Turbine.speedMode).toBe("free")
    }
  })

  // ADR 0018: the boiler already holds the right mass at 35% cold, so nothing is fed to it. The deaerator warm-up (#119)
  // lengthens the heat-up by about 10 min, so the 5% condensation pump drains the hotwell a little past its band edge
  // and the operator tops it up; nothing is ever rejected and the hotwell stays above its fully-open makeup edge
  test("no reject and the hotwell stays above its makeup ramp until working pressure", () => {
    const heatUpSamples = samples.filter((s) => s.time <= inBandAt)
    expect(heatUpSamples.length).toBeGreaterThan(0)
    for (const { state } of heatUpSamples) {
      expect(state.Condenser.rejectTotal).toBe(0)
      const level = hotwellLevel(state.Condenser.hotwellWaterVolume)
      expect(level).toBeGreaterThanOrEqual(LoopSettings.HotwellBandLow - LoopSettings.HotwellRamp)
      expect(level).toBeLessThanOrEqual(LoopSettings.HotwellBandHigh)
    }
  })

  // Hold lasts a single tick at 500, 1500 and 2500 rpm (the operator moves on as soon as it engages) and never
  // reaches a sample, so the states the operator sees in Hold are collected from a wrapped operator at tick resolution
  describe("run-up through the run-up points", () => {
    const seenInHold: PowerPlantState["Turbine"][] = []
    // Tick resolution only around the run-up: from just before Ramp up starts, for the run-up and a little more
    const rampStartState = samples.find((s) => s.time >= inBandAt - 10)?.state ?? turbineRunup.initial
    const ticks = runScenario({
      ...turbineRunup,
      initial: rampStartState,
      actions: [],
      duration: RunUpCheckDuration,
      sampleEvery: CstSimulation.DeltaTime,
      operator: (state, time) => {
        if (state.Turbine.speedMode === "hold") seenInHold.push(state.Turbine)
        return startupOperator(state, time)
      },
    })

    test.each([500, 1500, 2500, 3000])("passes through Hold at %i rpm within the engage window", (point) => {
      const held = seenInHold.find((turbine) => turbine.runUpPoint === point)
      expect(held).toBeDefined()
      expect(Math.abs((held?.rpm ?? 0) - point)).toBeLessThanOrEqual(
        CstSimulation.CstTurbine.HoldEngageWindow,
      )
    })

    test("Ramp up never exceeds the run-up rate and the turbine stays below MaxRPM throughout", () => {
      const rampPerTick = (CstSimulation.CstTurbine.RunUpRate * CstSimulation.DeltaTime) / 60
      for (const { state } of ticks.filter((s) => s.state.Turbine.speedMode === "rampUp")) {
        expect(state.Turbine.speedReference).toBeLessThanOrEqual(state.Turbine.runUpPoint)
        expect(Math.abs(state.Turbine.rpm - state.Turbine.speedReference)).toBeLessThan(5 * rampPerTick + 5)
      }
      for (const { state } of ticks) expect(state.Turbine.rpm).toBeLessThan(CstSimulation.CstTurbine.MaxRPM)
    })

    test("the run-up from working pressure to Hold at 3000 rpm takes about 60 min", () => {
      const start = firstTimeWhere(ticks, (s) => s.Turbine.speedMode === "rampUp") ?? Infinity
      const end =
        firstTimeWhere(ticks, (s) => s.Turbine.speedMode === "hold" && s.Turbine.runUpPoint === 3000) ??
        Infinity
      expect((end - start) / 60).toBeGreaterThan(55)
      expect((end - start) / 60).toBeLessThan(65)
    })
  })

  test("gas never goes above the heat-up gas once the pressure hold starts", () => {
    for (const { state } of samples.filter((s) => s.time >= inBandAt))
      expect(state.Boiler.gasFlow).toBeLessThanOrEqual(StartGas + 1e-6)
  })

  test("over the settling time boiler pressure stays within the band", () => {
    for (const { state } of last) expect(Math.abs(state.Boiler.pressure - Target)).toBeLessThanOrEqual(Band)
  })

  test("over the settling time the turbine is in Hold at 3000 ± 2 rpm, unloaded", () => {
    for (const { state } of last) {
      expect(Math.abs(state.Turbine.rpm - 3000)).toBeLessThanOrEqual(2)
      expect(state.Turbine.speedMode).toBe("hold")
      expect(state.Turbine.runUpPoint).toBe(3000)
      expect(state.Turbine.generatorBreaker).toBe(false)
    }
  })

  // At the ~4 kg/s no-load flow the gas hold is a slow limit cycle (gas floor, band edges, about 1000-2000 s), so the
  // balance is judged over a longer window than the 600 s of the others
  const BalanceWindow = 3000
  test("over the last 3000 s steam out of the boiler matches steam generated within 5%", () => {
    const balance = samples.filter((s) => s.time >= turbineRunup.duration - BalanceWindow)
    const out = average(balance.map((s) => s.state.Turbine.bypassSteamFlowOut + s.state.Turbine.turbineSteamFlowOut + s.state.Deaerator.letDownFlow))
    const generated = average(balance.map((s) => s.state.Boiler.deltaSteamMass))
    expect(Math.abs(out - generated)).toBeLessThanOrEqual(0.05 * generated)
  })

  test("the relief valve never lifts", () => {
    expect(lifts).toEqual([])
  })
})

// The turbine valve may only open under vacuum (ADR 0003): the scenarios pull it first and the turbine
// never trips. Sampled every tick, so a trip that a later opening clears again cannot slip between samples.
describe.each([turbineRunup, turbineSync])("$name under the vacuum limit", (scenario) => {
  // turbine-runup heats for hours first: it is run coarsely to just before the first opening, then at every tick
  const coarse = runScenario({ ...scenario, sampleEvery: 10 })
  const openAt = firstTimeWhere(coarse, (s) => s.Turbine.turbineValvePosition > 0) ?? 0
  const from = coarse.find((s) => s.time >= Math.max(0, openAt - 100))
  const samples = runScenario({
    ...scenario,
    initial: from?.state ?? scenario.initial,
    actions: [],
    duration: 400,
    sampleEvery: CstSimulation.DeltaTime,
  })
  const limit = CstSimulation.CstCondenser.VacuumLimit
  const firstOpen = samples.findIndex((s) => s.state.Turbine.turbineValvePosition > 0)

  test("condenser pressure is at or below the vacuum limit when the turbine valve first opens", () => {
    expect(firstOpen).toBeGreaterThanOrEqual(0)
    expect(samples[firstOpen].state.Condenser.pressure).toBeLessThanOrEqual(limit)
  })

  test("no turbine trip after the turbine valve opens", () => {
    const afterOpening = samples.slice(firstOpen)
    expect(afterOpening.filter((s) => s.state.Turbine.turbineTripped)).toEqual([])
  })
})
