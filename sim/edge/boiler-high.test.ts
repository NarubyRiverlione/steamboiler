import { describe, expect, test } from "vitest"
import { activeAlarms } from "../../src/context/Alarms"
import { CstSimulation } from "../../src/context/const"
import { boilerLevel } from "../../src/utils/boilerCalculations"
import { firstTimeWhere } from "../scenario"
import { runChecked } from "../scenario-checks"
import { boilerHigh } from "../scenarios/boiler-high"

const { HighHighLevel } = CstSimulation.CstBoiler

describe("boiler-high", () => {
  const { samples } = runChecked(boilerHigh)
  const levels = samples.map((s) => boilerLevel(s.state.Boiler.waterVolume))
  const tripAt = firstTimeWhere(samples, (s) => s.Boiler.boilerLevelHighTripped)

  test("starts below the alarm with the feed pump forced fully open", () => {
    expect(levels[0]).toBeLessThan(CstSimulation.CstBoiler.HighLevel)
    expect(samples[0].state.Deaerator.feedPumpValvePosition).toBe(1)
  })

  test("the alarm is active before the trip", () => {
    const alarmAt = firstTimeWhere(samples, (s) => activeAlarms(s).includes("boilerLevelHigh"))
    expect(alarmAt).toBeDefined()
    expect(tripAt).toBeDefined()
    expect(alarmAt ?? Infinity).toBeLessThan(tripAt ?? 0)
  })

  test("the feed pump trips at 70%: the valve is shut for good and nothing more is delivered", () => {
    const after = samples.filter((s) => s.time >= (tripAt ?? Infinity))
    expect(after.length).toBeGreaterThan(1)
    for (const { state } of after) {
      expect(state.Deaerator.feedPumpValvePosition).toBe(0)
      expect(state.Boiler.boilerLevelHighTripped).toBe(true)
    }
    expect(levels[samples.findIndex((s) => s.time === tripAt) - 1]).toBeLessThan(HighHighLevel + 0.01)
  })

  test("the level never reaches 100% and stays within one tick of inflow above the trip", () => {
    expect(Math.max(...levels)).toBeLessThan(HighHighLevel + 0.01)
  })

  test("the burner is not tripped by the high level", () => {
    for (const { state } of samples) expect(state.Boiler.burnerTripped).toBe(false)
  })
})
