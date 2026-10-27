import { describe, expect, test } from "vitest"
import { toCsv } from "./csv"
import { runScenario } from "./scenario"

describe("toCsv", () => {
  test("has a header and one row per sample covering all three subsystems", () => {
    const samples = runScenario({
      name: "test-heat-up",
      description: "Gas on, nothing else",
      duration: 60,
      sampleEvery: 10,
      actions: [{ at: 0, action: { type: "INCREASE_GAS_FLOW", amount: 5000 } }],
    })
    const csv = toCsv(samples).trim().split("\n")
    expect(csv).toHaveLength(1 + 6)
    expect(csv[0]).toMatch(/^time,/)
    expect(csv[0]).toContain("boiler_temperature")
    expect(csv[0]).toContain("turbine_rpm")
    expect(csv[0]).toContain("condenser_pressure")
    expect(csv[1].split(",")).toHaveLength(csv[0].split(",").length)
  })

  test("is empty for no samples", () => {
    expect(toCsv([])).toBe("")
  })
})
