import { describe, expect, test } from "vitest"
import { finalState, firstTimeWhere, runScenario, Scenario, trackLifts } from "./scenario"
import { scenarios } from "./scenarios"
import { loadSnapshot } from "./snapshot"
import { initialPowerPlantState, makeInitialState, powerPlantReducer } from "../src/context/PowerPlantReducer"
import { CstPhysics } from "../src/context/const"

const heatUp: Scenario = {
  name: "test-heat-up",
  description: "Gas knob turned up, nothing else",
  duration: 60,
  sampleEvery: 10,
  actions: [{ at: 0, action: { type: "SET_GAS_RATE", payload: { gasRateCommand: 1 } } }],
}

describe("runScenario", () => {
  test("samples every N sim-seconds including t=0", () => {
    const samples = runScenario(heatUp)
    expect(samples.map((s) => s.time)).toEqual([0, 10, 20, 30, 40, 50])
  })

  test("applies scripted actions through the reducer", () => {
    const samples = runScenario(heatUp)
    expect(samples[0].state.Boiler.gasRateCommand).toBe(1)
    expect(samples[2].state.Boiler.gasFlow).toBeGreaterThan(0)
  })

  test("matches stepping the reducer by hand", () => {
    let state = initialPowerPlantState
    state = powerPlantReducer(state, { type: "SET_GAS_RATE", payload: { gasRateCommand: 1 } })
    for (let i = 0; i < 100; i++) state = powerPlantReducer(state, { type: "SIMULATE_TICK" })
    const [, second] = runScenario(heatUp)
    expect(second.state.Boiler.temperature).toBe(state.Boiler.temperature)
  })

  test("starts from the scenario's initial state when given", () => {
    const warm = makeInitialState()
    const [first] = runScenario({
      ...heatUp,
      initial: { ...warm, Boiler: { ...warm.Boiler, temperature: 90 } },
    })
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
    const seen: { time: number; command: number }[] = []
    const samples = runScenario({
      ...heatUp,
      duration: 1,
      operator: (state, time) => {
        seen.push({ time, command: state.Boiler.gasRateCommand })
        return [{ type: "SET_GAS_RATE", payload: { gasRateCommand: 0.5 } }]
      },
    })
    expect(seen).toHaveLength(10)
    expect(seen[0]).toEqual({ time: 0, command: 1 })
    expect(seen[9].command).toBe(0.5)
    expect(samples[0].state.Boiler.gasRateCommand).toBe(0.5)
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
    expect(firstTimeWhere(samples, (s) => s.Boiler.gasRateCommand === 1)).toBe(0)
  })

  test("returns undefined when the condition never holds", () => {
    expect(firstTimeWhere(samples, (s) => s.Turbine.generatorBreaker)).toBeUndefined()
  })
})

describe("Hold", () => {
  // From the settled run-up in Hold: the PID drives the turbine valve, and a run replays identically
  const holdModeRun: Scenario = {
    name: "test-hold-mode",
    description: "Turbine at speed in hold mode",
    duration: 20,
    sampleEvery: 10,
    initial: loadSnapshot("turbine-runup"),
    actions: [],
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

  // 35 t of water at 4.196 kJ/kg·K plus 100 t of steel at 0.5 kJ/kg·K, 20 K above 0 °C: about 2932 + 1000 MJ
  test("is at ambient temperature and atmospheric pressure, with energy matching temperature, water and metal", () => {
    expect(cold.Boiler.temperature).toBe(CstPhysics.AmbientTemperature)
    expect(cold.Condenser.hotwellTemperature).toBe(CstPhysics.AmbientTemperature)
    expect(cold.Boiler.pressure).toBe(CstPhysics.AtmosphericPressure_mBar / 1e3)
    expect(cold.Boiler.energy).toBeCloseTo(3_931_923, 0) // 34 937 kg of water at 4.196 kJ/kg·K and 100 t of steel at 0.5, from 0 °C to 20 °C
  })

  test("makes no steam on the first tick", () => {
    const next = powerPlantReducer(cold, { type: "SIMULATE_TICK" })
    expect(next.Boiler.steamMass).toBe(cold.Boiler.steamMass)
    expect(next.Boiler.deltaSteamMass).toBe(0)
    expect(next.Boiler.pressure).toBe(cold.Boiler.pressure)
  })

  test("stays exactly at rest for 10 min with nothing running", () => {
    // The condenser pressure and air are the sum of a vapour and an air term and drift by rounding only
    // The deaerator's air and pressure are sums too (ADR 0038): the cold air at atmospheric pressure, no vent flow
    const sameButSums = (state: typeof cold) => {
      expect(state.Condenser.pressure).toBeCloseTo(cold.Condenser.pressure, 2)
      expect(state.Condenser.airMass).toBeCloseTo(cold.Condenser.airMass, 2)
      expect(state.Deaerator.pressure).toBeCloseTo(cold.Deaerator.pressure, 6)
      expect(state.Deaerator.airMass).toBeCloseTo(cold.Deaerator.airMass, 6)
      // a boiler at exactly atmospheric pressure against a vessel a rounding error below it passes a flow of 1e-17 kg/s
      expect(state.Deaerator.letDownFlow).toBeCloseTo(0, 9)
      const zeroed = { pressure: 0, airMass: 0, airPressure: 0, saturationPressure: 0, waterVolume: 0, letDownFlow: 0, letDownValvePosition: 0 }
      expect({
        ...state,
        Condenser: { ...state.Condenser, pressure: 0, airMass: 0 },
        Deaerator: { ...state.Deaerator, ...zeroed },
      }).toEqual({
        ...cold,
        Condenser: { ...cold.Condenser, pressure: 0, airMass: 0 },
        Deaerator: { ...cold.Deaerator, ...zeroed },
      })
    }
    for (const { state } of runScenario(rest)) sameButSums(state)
    sameButSums(finalState(rest))
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
      "turbine-load",
      "relief-lift",
      "hotwell-high",
      "hotwell-low",
      "boiler-low",
      "heat-up",
      "low-pressure-close",
      "max-output",
      "return-stop",
      "turbine-trip",
      "vacuum-loss",
      "sjae-closed-load",
      "deaerator-vent-closed",
      "deaerator-vent-open",
    ])
    for (const [name, s] of Object.entries(scenarios)) expect(s.name).toBe(name)
  })
})
