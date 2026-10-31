import { describe, expect, test } from "vitest"
import { runScenario } from "./scenario"
import { scenarios } from "./scenarios"

// Steam generation by energy balance, judged on the cold start.
const BoilingPoint = 99 // °C, a little under the table value so sampling noise cannot trip it

describe("startup-cold steam generation", () => {
  const samples = runScenario(scenarios["startup-cold"])

  test("generates no steam until the water has reached boiling", () => {
    const early = samples.filter(({ state }) => state.Boiler.temperature < BoilingPoint)
    expect(early.length).toBeGreaterThan(0)
    for (const { state } of early) expect(state.Boiler.deltaSteamMass).toBe(0)
  })

  test("generates steam once the water is boiling", () => {
    expect(samples.some(({ state }) => state.Boiler.deltaSteamMass > 0)).toBe(true)
  })
})
