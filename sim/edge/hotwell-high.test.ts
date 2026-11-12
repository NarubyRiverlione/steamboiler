import { describe, expect, test } from "vitest"
import { firstTimeWhere } from "../scenario"
import { runChecked } from "../scenario-checks"
import { hotwellHigh } from "../scenarios/hotwell-high"
import { hotwellLevel } from "../../src/utils/condenserCalculation"
import { activeAlarms } from "../../src/context/Alarms"
import { CstSimulation } from "../../src/context/const"

const { HotwellHighHigh } = CstSimulation.CstCondenser

describe("hotwell-high", () => {
  const { samples } = runChecked(hotwellHigh)
  const levels = samples.map((s) => hotwellLevel(s.state.Condenser.hotwellWaterVolume))
  const reachedAt = firstTimeWhere(samples, (s) => hotwellLevel(s.Condenser.hotwellWaterVolume) >= HotwellHighHigh)

  test("starts inside the working band with makeup open and reject shut", () => {
    expect(levels[0]).toBeLessThan(HotwellHighHigh)
    expect(samples[0].state.Condenser.makeupValvePosition).toBe(1)
    expect(samples[0].state.Condenser.rejectValvePosition).toBe(0)
  })

  test("the level reaches high-high with the reject valve still shut as set", () => {
    expect(reachedAt).toBeDefined()
    for (const { state } of samples) expect(state.Condenser.rejectValvePosition).toBe(0)
  })

  test("the high level alarm is on before the level reaches high-high, where the clamp acts", () => {
    const alarmAt = firstTimeWhere(samples, (s) => activeAlarms(s).includes("hotwellLevelHigh"))
    expect(alarmAt).toBeDefined()
    expect(alarmAt ?? Infinity).toBeLessThan(reachedAt ?? 0)
  })

  test("from high-high the clamp rejects as much as the makeup brings: the hotwell never overflows", () => {
    expect(Math.max(...levels)).toBeLessThan(1)
    const at = samples.find((s) => s.time === reachedAt)?.state.Condenser
    const end = samples.at(-1)?.state.Condenser
    expect(end ? end.rejectTotal - (at?.rejectTotal ?? 0) : 0).toBeGreaterThan(0)
    expect(end ? end.makeupTotal - (at?.makeupTotal ?? 0) : 0).toBeGreaterThan(0)
  })
})
