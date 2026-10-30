import { describe, expect, test } from "vitest"
import { firstTimeWhere, runScenario, Scenario } from "./scenario"
import { scenarios } from "./scenarios"
import { cooldown, CooldownDuration } from "./scenarios/cooldown"
import { startupCold } from "./scenarios/startup-cold"
import { AtPressure, TurbineValveOpenAt } from "./scenarios/steps"
import { turbineStart } from "./scenarios/turbine-start"
import { turbineSync } from "./scenarios/turbine-sync"
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
      runScenario({ ...heatUp, actions: [{ at: 999, action: { type: "TOGGLE_DRAIN_VALVE" } }] }),
    ).toThrow()
  })

  test("operator actions go through the reducer every tick, after the timed actions", () => {
    const seen: { time: number; gas: number }[] = []
    const samples = runScenario({
      ...heatUp,
      duration: 1,
      operator: (state, time) => {
        seen.push({ time, gas: state.Boiler.gasFlow })
        return [{ type: "INCREASE_GAS_FLOW", amount: 1 }]
      },
    })
    expect(seen).toHaveLength(10)
    expect(seen[0]).toEqual({ time: 0, gas: 5000 })
    expect(seen[9].gas).toBe(5009)
    expect(samples[0].state.Boiler.gasFlow).toBe(5001)
  })

  test("no operator actions leaves the run unchanged", () => {
    const [, plain] = runScenario(heatUp)
    const [, idle] = runScenario({ ...heatUp, operator: () => [] })
    expect(idle.state).toEqual(plain.state)
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
})

describe("turbine-start", () => {
  const samples = runScenario(turbineStart)
  const afterOpening = samples.filter((s) => s.time > TurbineValveOpenAt)

  test("turbine keeps rolling after the valve opens", () => {
    for (const { state } of afterOpening) expect(state.Turbine.rpm).toBeGreaterThan(0)
  })

  test("turbine speeds up after the valve opens", () => {
    expect(afterOpening.at(-1)?.state.Turbine.rpm).toBeGreaterThan(afterOpening[0].state.Turbine.rpm)
  })
})

describe("turbine-sync", () => {
  const samples = runScenario(turbineSync)

  test.fails("reaches sync speed (3000 rpm) (fails until #18, #21)", () => {
    expect(firstTimeWhere(samples, (s) => Math.abs(s.Turbine.rpm - 3000) <= 2)).toBeDefined()
  })

  test.fails("generator breaker closes (fails until #18, #21)", () => {
    expect(samples.at(-1)?.state.Turbine.generatorBreaker).toBe(true)
  })
})

describe("cooldown", () => {
  const samples = runScenario(cooldown)

  test("is at main-steam-valve pressure (10 bar) when the gas goes off", () => {
    expect(samples.find((s) => s.time === AtPressure)?.state.Boiler.pressure).toBeGreaterThan(10)
  })

  test("runs 60 min with gas off and all valves closed", () => {
    const cooling = samples.filter((s) => s.time > AtPressure)
    expect(cooling.at(-1)?.time).toBeGreaterThanOrEqual(AtPressure + CooldownDuration - 10)
    for (const { state } of cooling) {
      expect(state.Boiler.gasFlow).toBe(0)
      expect(state.Turbine.mainSteamValve).toBe(false)
      expect(state.Turbine.turbineValvePosition + state.Turbine.bypassValvePosition).toBe(0)
      expect(state.Boiler.drainValveOpen).toBe(false)
    }
  })

  test("cools down", () => {
    const start = samples.find((s) => s.time === AtPressure)?.state.Boiler.temperature ?? 0
    expect(samples.at(-1)?.state.Boiler.temperature).toBeLessThan(start)
  })
})

describe("scenario registry", () => {
  test("registers every scenario under its own name", () => {
    expect(Object.keys(scenarios)).toEqual([
      "startup-cold",
      "turbine-start",
      "turbine-sync",
      "cooldown",
      "bypass-loop",
    ])
    for (const [name, s] of Object.entries(scenarios)) expect(s.name).toBe(name)
  })
})
