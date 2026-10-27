import { describe, expect, test } from "vitest"
import { firstTimeWhere, runScenario, Scenario } from "./scenario"
import { startupCold } from "./scenarios/startup-cold"
import { initialPowerPlantState, makeInitialState, powerPlantReducer } from "../src/context/PowerPlantReducer"

const heatUp: Scenario = {
  name: "test-heat-up",
  description: "Gas on, nothing else",
  duration: 60,
  sampleEvery: 10,
  actions: [{ at: 0, action: { type: "INCREASE_GAS_FLOW", amount: 5000 } }],
}

describe("runScenario", () => {
  test("samples every N sim-seconds including t=0", () => {
    const samples = runScenario(heatUp)
    expect(samples.map((s) => s.time)).toEqual([0, 10, 20, 30, 40, 50])
  })

  test("applies scripted actions through the reducer", () => {
    const samples = runScenario(heatUp)
    expect(samples[0].state.Boiler.gasFlow).toBe(5000)
  })

  test("matches stepping the reducer by hand", () => {
    let state = initialPowerPlantState
    state = powerPlantReducer(state, { type: "INCREASE_GAS_FLOW", amount: 5000 })
    for (let i = 0; i < 100; i++) state = powerPlantReducer(state, { type: "SIMULATE_TICK" })
    const [, second] = runScenario(heatUp)
    expect(second.state.Boiler.temperature).toBe(state.Boiler.temperature)
  })

  test("starts from the scenario's initial state when given", () => {
    const [first] = runScenario({ ...heatUp, initial: makeInitialState(20) })
    expect(first.state.Boiler.temperature).toBe(20)
  })

  test("rejects scenarios that would silently record nothing", () => {
    expect(() => runScenario({ ...heatUp, sampleEvery: 0 })).toThrow()
    expect(() =>
      runScenario({ ...heatUp, actions: [{ at: 999, action: { type: "TOGGLE_FILL_VALVE" } }] }),
    ).toThrow()
  })

  test("one simulated hour runs in a few seconds at most", () => {
    const start = performance.now()
    runScenario({ ...heatUp, duration: 3600, sampleEvery: 10 })
    expect(performance.now() - start).toBeLessThan(5000)
  })
})

describe("firstTimeWhere", () => {
  const samples = runScenario(heatUp)

  test("returns the sim-time of the first sample where the condition holds", () => {
    const expected = samples.find((s) => s.state.Boiler.temperature > samples[0].state.Boiler.temperature)?.time
    expect(firstTimeWhere(samples, (s) => s.Boiler.temperature > samples[0].state.Boiler.temperature)).toBe(
      expected,
    )
  })

  test("returns 0 when the condition holds from the start", () => {
    expect(firstTimeWhere(samples, (s) => s.Boiler.gasFlow === 5000)).toBe(0)
  })

  test("returns undefined when the condition never holds", () => {
    expect(firstTimeWhere(samples, (s) => s.Turbine.generatorBreaker)).toBeUndefined()
  })
})

describe("makeInitialState", () => {
  test("defaults to the UI's warm start", () => {
    expect(makeInitialState()).toEqual(initialPowerPlantState)
  })
})

describe("startup-cold", () => {
  const samples = runScenario(startupCold)

  test("starts cold and at rest", () => {
    expect(samples[0].state.Boiler.temperature).toBe(20)
    expect(samples[0].state.Turbine.rpm).toBe(0)
  })

  test("reaches main-steam-valve pressure (10 bar) before the valve is opened at 720 s", () => {
    expect(firstTimeWhere(samples, (s) => s.Boiler.pressure > 10)).toBeLessThan(720)
  })

  test("main steam valve opens when commanded and the turbine spins up", () => {
    expect(firstTimeWhere(samples, (s) => s.Turbine.mainSteamValve)).toBe(720)
    expect(firstTimeWhere(samples, (s) => s.Turbine.rpm > 0)).toBeGreaterThan(720)
  })

  test("stays physical: no NaN or infinite values", () => {
    for (const { state } of samples)
      for (const part of [state.Boiler, state.Turbine, state.Condenser])
        for (const value of Object.values(part))
          if (typeof value === "number") expect(Number.isFinite(value)).toBe(true)
  })
})
