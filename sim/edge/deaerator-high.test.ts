import { describe, expect, test } from "vitest"
import { activeAlarms } from "../../src/context/Alarms"
import { CstDeaerator } from "../../src/context/const"
import { deaeratorLevel } from "../../src/context/Deaerator/DeaeratorTick"
import { firstTimeWhere } from "../scenario"
import { runChecked } from "../scenario-checks"
import { deaeratorHigh } from "../scenarios/deaerator-high"

const { HighLevel, HighHighLevel } = CstDeaerator

describe("deaerator-high", () => {
  const { samples } = runChecked(deaeratorHigh)
  const levels = samples.map((s) => deaeratorLevel(s.state.Deaerator.waterVolume))
  const tripAt = firstTimeWhere(samples, (s) => s.Deaerator.deaeratorHighHighTripped)

  test("starts below the warning with the feed pump shut, and the condensation pump opens once the hotwell is full", () => {
    expect(levels[0]).toBeLessThan(HighLevel)
    expect(samples[0].state.Deaerator.feedPumpValvePosition).toBe(0)
    const openAt = firstTimeWhere(samples, (s) => s.Condenser.condensationPumpValvePosition === 1)
    expect(openAt).toBeDefined()
    expect(openAt ?? Infinity).toBeLessThan(tripAt ?? 0)
  })

  test("the 75% warning is active before the trip", () => {
    const alarmAt = firstTimeWhere(samples, (s) => activeAlarms(s).includes("deaeratorLevelHigh"))
    expect(alarmAt).toBeDefined()
    expect(tripAt).toBeDefined()
    expect(alarmAt ?? Infinity).toBeLessThan(tripAt ?? 0)
  })

  test("the pump trips at 85%: valve shut for good, nothing returned, error tile on", () => {
    const after = samples.filter((s) => s.time >= (tripAt ?? Infinity))
    expect(after.length).toBeGreaterThan(1)
    for (const s of after) {
      expect(s.state.Condenser.condensationPumpValvePosition).toBe(0)
      expect(s.state.Condenser.returnRate).toBe(0)
      expect(activeAlarms(s.state)).toContain("deaeratorHighHighTripped")
    }
  })

  test("the trip is at 85%: the level never nears full, and the steam still condensing in only lifts it a few points", () => {
    const tripIndex = samples.findIndex((s) => s.time === tripAt)
    expect(levels[tripIndex - 1]).toBeLessThan(HighHighLevel)
    expect(levels[tripIndex]).toBeGreaterThanOrEqual(HighHighLevel)
    expect(levels[tripIndex]).toBeLessThan(HighHighLevel + 0.01)
    expect(Math.max(...levels)).toBeLessThan(0.9)
  })

  test("the hotwell's own trip is not set", () => {
    for (const { state } of samples) expect(state.Condenser.condensationPumpTripped).toBe(false)
  })
})
