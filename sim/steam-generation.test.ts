import { describe, expect, test } from "vitest"
import { runScenario } from "./scenario"
import { scenarios } from "./scenarios"
import { getSteamData } from "../src/utils/steamTable"

// Pressure law (ADR 0001), judged on the cold start: saturation pressure of the water, never below atmospheric.
const Atmospheric = 1.01325 // bar

describe("startup-cold pressure follows saturation", () => {
  const samples = runScenario(scenarios["startup-cold"])

  test("pressure is finite and equals max(atmospheric, Psat(T)) at every sample", () => {
    for (const { state } of samples) {
      const { pressure, temperature } = state.Boiler
      expect(Number.isFinite(pressure)).toBe(true)
      expect(pressure).toBeCloseTo(Math.max(Atmospheric, getSteamData(temperature).pressure), 6)
    }
  })

  test("stays atmospheric until the water passes 100 °C, then rises with it", () => {
    for (const { state } of samples.filter((s) => s.state.Boiler.temperature < 99))
      expect(state.Boiler.pressure).toBeCloseTo(Atmospheric, 6)
    expect(samples.at(-1)?.state.Boiler.pressure).toBeGreaterThan(100)
  })
})
