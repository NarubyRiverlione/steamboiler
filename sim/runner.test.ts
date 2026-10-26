import { describe, expect, test } from "vitest"
import { runScenario, toCsv, Scenario } from "./runner"
import { initialPowerPlantState, powerPlantReducer } from "../src/context/PowerPlantReducer"

const heatUp: Scenario = {
  name: "test-heat-up",
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

describe("toCsv", () => {
  test("has a header and one row per sample covering all three subsystems", () => {
    const csv = toCsv(runScenario(heatUp)).trim().split("\n")
    expect(csv).toHaveLength(1 + 6)
    expect(csv[0]).toMatch(/^time,/)
    expect(csv[0]).toContain("boiler_temperature")
    expect(csv[0]).toContain("turbine_rpm")
    expect(csv[0]).toContain("condenser_pressure")
    expect(csv[1].split(",")).toHaveLength(csv[0].split(",").length)
  })
})
