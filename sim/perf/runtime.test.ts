import { describe, expect, test } from "vitest"
import { runScenario, Scenario } from "../scenario"

const heatUp: Scenario = {
  name: "test-heat-up",
  description: "Gas on, nothing else",
  duration: 60,
  sampleEvery: 10,
  actions: [{ at: 0, action: { type: "SET_GAS_RATE", payload: { gasRateCommand: 1 } } }],
}

describe("runner speed", () => {
  test("one simulated hour runs in a few seconds at most", () => {
    const start = performance.now()
    runScenario({ ...heatUp, duration: 3600, sampleEvery: 10 })
    // Measured times and where the limit comes from: see headless-runner.md
    expect(performance.now() - start).toBeLessThan(15_000)
  })
})
