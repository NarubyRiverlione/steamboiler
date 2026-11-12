import { describe, expect, test } from "vitest"
import { activeAlarms } from "../../src/context/Alarms"
import { runScenario } from "../scenario"
import { goldenPath } from "../scenarios"

// One run per scenario, shared by the checks: the golden path never raises a level alarm or a level trip
describe.each(goldenPath)("$name level alarms", (scenario) => {
  const samples = runScenario(scenario)
  const raisedAt = (ids: string[]): number[] =>
    samples.filter(({ state }) => activeAlarms(state).some((id: string) => ids.includes(id))).map((s) => s.time)

  test("the hotwell level alarms never come on", () => {
    expect(raisedAt(["hotwellLevelLow", "hotwellLevelHigh"])).toEqual([])
  })

  test("the boiler level alarm and the high-high trip never come on (#62)", () => {
    expect(raisedAt(["boilerLevelHigh", "boilerLevelHighTripped"])).toEqual([])
  })
})
