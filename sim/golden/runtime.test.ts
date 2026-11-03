import { describe, expect, test } from "vitest"
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
    // 2.6 s plain, 7.8-8.6 s under coverage instrumentation on a 15 W laptop CPU: see headless-runner.md
    expect(performance.now() - start).toBeLessThan(15_000)
  })
})
