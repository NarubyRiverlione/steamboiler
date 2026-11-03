import { describe, expect, test } from "vitest"
import { finalState, firstTimeWhere, runScenario, Scenario, trackLifts } from "./scenario"
import { scenarios } from "./scenarios"
import { loadSnapshot } from "./snapshot"
import { initialPowerPlantState, makeInitialState, powerPlantReducer } from "../src/context/PowerPlantReducer"
import { CstPhysics } from "../src/context/const"

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
    const warm = makeInitialState()
    const [first] = runScenario({ ...heatUp, initial: { ...warm, Boiler: { ...warm.Boiler, temperature: 90 } } })
    expect(first.state.Boiler.temperature).toBe(90)
  })

  test("finalState is the state after the last tick", () => {
    const oneTick = { ...heatUp, duration: 0.1, sampleEvery: 0.1 }
    const [start] = runScenario(oneTick)
    expect(finalState(oneTick)).toEqual(powerPlantReducer(start.state, { type: "SIMULATE_TICK" }))
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

describe("hold mode", () => {
  // From the settled run-up, hold mode on: the PID drives the turbine valve, and a run replays identically
  const holdModeRun: Scenario = {
    name: "test-hold-mode",
    description: "Turbine at speed in hold mode",
    duration: 20,
    sampleEvery: 10,
    initial: loadSnapshot("turbine-runup"),
    actions: [{ at: 0, action: { type: "TOGGLE_HOLD_MODE" } }],
  }

  test("replays identically when run twice in one process", () => {
    const first = runScenario(holdModeRun)
    expect(first.at(-1)?.state.Turbine.pidIntegralError).not.toBe(0) // the PID really ran
    expect(runScenario(holdModeRun)).toEqual(first)
  })
})

describe("cold initial state", () => {
  const cold = makeInitialState()
  const rest: Scenario = { name: "test-rest", description: "Nothing on", duration: 600, sampleEvery: 60, actions: [] }

  test("is what the UI starts from", () => {
    expect(initialPowerPlantState).toEqual(cold)
  })

  // 50 t of water at 4.196 kJ/kg·K plus 100 t of steel at 0.5 kJ/kg·K, 20 K above 0 °C: 4196 + 1000 MJ
  test("is at ambient temperature and atmospheric pressure, with energy matching temperature, water and metal", () => {
    expect(cold.Boiler.temperature).toBe(CstPhysics.AmbientTemperature)
    expect(cold.Condenser.hotwellTemperature).toBe(CstPhysics.AmbientTemperature)
    expect(cold.Boiler.pressure).toBe(CstPhysics.AtmosphericPressure_mBar / 1e3)
    expect(cold.Boiler.energy).toBeCloseTo(5_188_461, 0) // 49 910 kg of water at 4.196 kJ/kg·K and 100 t of steel at 0.5, from 0 °C to 20 °C
  })

  test("makes no steam on the first tick", () => {
    const next = powerPlantReducer(cold, { type: "SIMULATE_TICK" })
    expect(next.Boiler.steamMass).toBe(cold.Boiler.steamMass)
    expect(next.Boiler.deltaSteamMass).toBe(0)
    expect(next.Boiler.pressure).toBe(cold.Boiler.pressure)
  })

  test("stays exactly at rest for 10 min with nothing running", () => {
    for (const { state } of runScenario(rest)) expect(state).toEqual(cold)
    expect(finalState(rest)).toEqual(cold)
  })
})

describe("trackLifts", () => {
  const plant = makeInitialState()
  const valve = (open: boolean, ventedTotal: number) => ({
    ...plant,
    Boiler: { ...plant.Boiler, reliefValveOpen: open, ventedTotal },
  })

  test("a run from a snapshot taken mid-lift starts the lift at its first tick", () => {
    expect(trackLifts([], valve(true, 100), valve(false, 150), 0)).toEqual([{ open: 0, close: 0, vented: 50 }])
  })

  test("a lift still open at the end has no close time", () => {
    const opened = trackLifts([], valve(false, 0), valve(true, 50), 10)
    expect(trackLifts(opened, valve(true, 50), valve(true, 100), 10.1)).toEqual([{ open: 10, vented: 100 }])
  })
})

describe("scenario registry", () => {
  test("registers every scenario under its own name, golden path first", () => {
    expect(Object.keys(scenarios)).toEqual([
      "bypass-loop",
      "turbine-runup",
      "turbine-sync",
      "relief-lift",
      "hotwell-high",
      "hotwell-low",
      "boiler-low",
      "heat-up",
    ])
    for (const [name, s] of Object.entries(scenarios)) expect(s.name).toBe(name)
  })
})
