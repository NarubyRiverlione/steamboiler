import { describe, expect, test } from "vitest"
import { activeAlarms } from "../../src/context/Alarms"
import { runScenario } from "../scenario"
import { goldenPath } from "../scenarios"

describe.each(goldenPath)("$name hotwell alarms", (scenario) => {
  test("the hotwell level alarms never come on", () => {
    const raised = runScenario(scenario).filter(({ state }) => {
      const active: string[] = activeAlarms(state)
      return active.includes("hotwellLevelLow") || active.includes("hotwellLevelHigh")
    })
    expect(raised.map((s) => s.time)).toEqual([])
  })
})
