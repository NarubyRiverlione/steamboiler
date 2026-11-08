import { describe, expect, test } from "vitest"
import { CstSimulation } from "../../src/context/const"
import { runTicks } from "../../src/context/PowerPlantBatch"
import { powerPlantReducer, makeInitialState } from "../../src/context/PowerPlantReducer"
import { runScenario, Scenario } from "../scenario"

const heatUp: Scenario = {
  name: "test-heat-up",
  description: "Gas on, nothing else",
  duration: 60,
  sampleEvery: 10,
  actions: [{ at: 0, action: { type: "INCREASE_GAS_FLOW", amount: 5000 } }],
}

describe("runner speed", () => {
  test("one simulated hour runs in a few seconds at most", () => {
    const start = performance.now()
    runScenario({ ...heatUp, duration: 3600, sampleEvery: 10 })
    // Measured times and where the limit comes from: see headless-runner.md
    expect(performance.now() - start).toBeLessThan(15_000)
  })
})

describe("playback batch", () => {
  test("a capped batch fits in one loop update interval", () => {
    // Gas on, so the tick does real work; the cap is where this stays under UpdateInterval (ADR 0026)
    const start = powerPlantReducer(makeInitialState(), { type: "INCREASE_GAS_FLOW", amount: 300 })
    runTicks(start, 100) // warm up the JIT
    const t0 = performance.now()
    const { ticksRun } = runTicks(start, CstSimulation.MaxTicksPerUpdate)
    const ms = performance.now() - t0
    console.log(`${String(ticksRun)} ticks in ${ms.toFixed(2)} ms`)
    expect(ms).toBeLessThan(CstSimulation.UpdateInterval)
  })
})
