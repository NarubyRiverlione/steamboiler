import { describe, expect, test } from "vitest"
import { firstTimeWhere, runScenario, runScenarioWithLifts } from "../scenario"
import { PressureHoldSettings } from "../scenarios/pressure-hold"
import { StartupSettings, turbineRunup } from "../scenarios/turbine-runup"
import { turbineSync } from "../scenarios/turbine-sync"
import { StartGas } from "../scenarios/steps"
import { CstSimulation } from "../../src/context/const"

describe("turbine-runup", () => {
  const { samples, lifts } = runScenarioWithLifts(turbineRunup)

  test("starts cold and at rest", () => {
    expect(samples[0].state.Boiler.temperature).toBe(20)
    expect(samples[0].state.Turbine.rpm).toBe(0)
  })

  test("reaches main-steam-valve pressure (10 bar) before the valve is opened at 780 s", () => {
    expect(firstTimeWhere(samples, (s) => s.Boiler.pressure > 10)).toBeLessThan(780)
  })

  test("main steam valve opens when commanded and the turbine spins up", () => {
    expect(firstTimeWhere(samples, (s) => s.Turbine.mainSteamValve)).toBe(780)
    expect(firstTimeWhere(samples, (s) => s.Turbine.rpm > 0)).toBeGreaterThan(780)
  })

  const { Target, Band } = PressureHoldSettings
  const inBandAt = firstTimeWhere(samples, (s) => Math.abs(s.Boiler.pressure - Target) <= Band) ?? Infinity
  const last = samples.filter((s) => s.time >= turbineRunup.duration - 600)
  const average = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length

  test("builds pressure with the turbine valve cracked to 5% until pressure first enters the band", () => {
    expect(inBandAt).toBeLessThan(turbineRunup.duration - 600)
    for (const { state } of samples.filter((s) => s.time > 790 && s.time < inBandAt))
      expect(state.Turbine.turbineValvePosition).toBeCloseTo(0.05, 9)
  })

  test("opens the turbine valve once to its load opening when pressure enters the band", () => {
    const after = samples.filter((s) => s.time > inBandAt)
    expect(after.length).toBeGreaterThan(0)
    for (const { state } of after) expect(state.Turbine.turbineValvePosition).toBeCloseTo(StartupSettings.TurbineLoadOpening, 9)
  })

  test("gas never goes above the heat-up gas once the pressure hold starts", () => {
    for (const { state } of samples.filter((s) => s.time >= inBandAt))
      expect(state.Boiler.gasFlow).toBeLessThanOrEqual(StartGas)
  })

  test("over the last 600 s boiler pressure stays within the band", () => {
    for (const { state } of last) expect(Math.abs(state.Boiler.pressure - Target)).toBeLessThanOrEqual(Band)
  })

  test("over the last 600 s turbine speed is 3000 ± 50 rpm and below MaxRPM, unloaded and without hold mode", () => {
    for (const { state } of last) {
      expect(Math.abs(state.Turbine.rpm - 3000)).toBeLessThanOrEqual(50)
      expect(state.Turbine.rpm).toBeLessThan(CstSimulation.CstTurbine.MaxRPM)
      expect(state.Turbine.holdMode).toBe(false)
      expect(state.Turbine.generatorBreaker).toBe(false)
    }
  })

  test("over the last 600 s steam out of the boiler matches steam generated within 5%", () => {
    const out = average(last.map((s) => s.state.Turbine.bypassSteamFlowOut + s.state.Turbine.turbineSteamFlowOut))
    const generated = average(last.map((s) => s.state.Boiler.deltaSteamMass))
    expect(Math.abs(out - generated)).toBeLessThanOrEqual(0.05 * generated)
  })

  test("the relief valve never lifts", () => {
    expect(lifts).toEqual([])
  })
})

// The turbine valve may only open under vacuum (ADR 0003): the scenarios pull it first and the turbine
// never trips. Sampled every tick, so a trip that a later opening clears again cannot slip between samples.
const VacuumCheckDuration = 4000 // sim-seconds: covers the first opening and the turbine valve going to its load opening
describe.each([turbineRunup, turbineSync])("$name under the vacuum limit", (scenario) => {
  const samples = runScenario({
    ...scenario,
    duration: Math.min(scenario.duration, VacuumCheckDuration),
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
