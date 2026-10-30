import { describe, expect, test } from "vitest"
import { finalState, firstTimeWhere, runScenario, Scenario } from "./scenario"
import { scenarios } from "./scenarios"
import { cooldown, CooldownDuration } from "./scenarios/cooldown"
import { startupCold } from "./scenarios/startup-cold"
import { AtPressure, heatUp as heatUpSteps, openMainSteam, rollTurbine, since, TurbineValveOpenAt } from "./scenarios/steps"
import { turbineStart } from "./scenarios/turbine-start"
import { turbineSync } from "./scenarios/turbine-sync"
import { initialPowerPlantState, makeInitialState, powerPlantReducer } from "../src/context/PowerPlantReducer"
import { CstPhysics } from "../src/context/const"
import { calculateHeatingEnergy } from "../src/utils/boilerCalculations"

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

describe("hold mode", () => {
  // From pressure, roll the turbine, then let the hold-mode PID drive the turbine valve. The turbine
  // only reaches ~30 rpm today (#18), so a set point of 20 rpm keeps the PID off its valve limits.
  const valveOpen = TurbineValveOpenAt - AtPressure
  const holdModeRun: Scenario = {
    name: "test-hold-mode",
    description: "Turbine rolling in hold mode at a 20 rpm set point",
    duration: valveOpen + 300,
    sampleEvery: 10,
    initial: turbineStart.initial,
    actions: [
      ...turbineStart.actions,
      { at: valveOpen + 5, action: { type: "ADJUST_RPM_SETPOINT", payload: { rpmAdjustment: -2980 } } },
      { at: valveOpen + 10, action: { type: "TOGGLE_HOLD_MODE" } },
    ],
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

  test("is at ambient temperature and atmospheric pressure, with energy matching temperature and water", () => {
    expect(cold.Boiler.temperature).toBe(CstPhysics.AmbientTemperature)
    expect(cold.Condenser.hotwellTemperature).toBe(CstPhysics.AmbientTemperature)
    expect(cold.Boiler.pressure).toBe(CstPhysics.AtmosphericPressure_mBar / 1e3)
    expect(cold.Boiler.energy).toBe(
      calculateHeatingEnergy(cold.Boiler.waterVolume, 0, CstPhysics.AmbientTemperature),
    )
  })

  test("makes no steam on the first tick", () => {
    const next = powerPlantReducer(cold, { type: "SIMULATE_TICK" })
    expect(next.Boiler.steamMass).toBe(0)
    expect(next.Boiler.deltaSteamMass).toBe(0)
    expect(next.Boiler.pressure).toBe(cold.Boiler.pressure)
  })

  test("stays exactly at rest for 10 min with nothing running", () => {
    for (const { state } of runScenario(rest)) expect(state).toEqual(cold)
    expect(finalState(rest)).toEqual(cold)
  })
})

describe("snapshot start", () => {
  test("turbine-start from at-pressure equals replaying the cold start", () => {
    const replay = runScenario({
      ...turbineStart,
      duration: AtPressure + turbineStart.duration,
      initial: makeInitialState(),
      actions: [...heatUpSteps, ...openMainSteam, ...rollTurbine],
    })
    const fromSnapshot = runScenario(turbineStart)
    expect(fromSnapshot.map((s) => s.state)).toEqual(replay.filter((s) => s.time >= AtPressure).map((s) => s.state))
  })

  test("since() moves steps to the snapshot's clock", () => {
    expect(since(AtPressure, openMainSteam).map((a) => a.at)).toEqual([0, 10])
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
  const afterOpening = samples.filter((s) => s.time > TurbineValveOpenAt - AtPressure)

  test("starts at main-steam-valve pressure with the turbine still", () => {
    expect(samples[0].state.Boiler.pressure).toBeGreaterThan(10)
    expect(samples[0].state.Turbine.rpm).toBe(0)
  })

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
      "heat-up",
      "turbine-start",
      "turbine-sync",
      "cooldown",
      "bypass-loop",
    ])
    for (const [name, s] of Object.entries(scenarios)) expect(s.name).toBe(name)
  })
})
