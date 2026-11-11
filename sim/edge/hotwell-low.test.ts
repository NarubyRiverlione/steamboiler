import { describe, expect, test } from "vitest"
import { firstTimeWhere, runScenario } from "../scenario"
import { hotwellLow } from "../scenarios/hotwell-low"
import { hotwellLevel } from "../../src/utils/condenserCalculation"
import { activeAlarms } from "../../src/context/Alarms"
import { CstSimulation } from "../../src/context/const"

const { HotwellLowLow } = CstSimulation.CstCondenser

describe("hotwell-low", () => {
  const samples = runScenario(hotwellLow)
  const trippedAt = firstTimeWhere(samples, (s) => s.Condenser.condensationPumpTripped)

  test("starts inside the working band with the pump running, makeup shut and reject open", () => {
    const { Condenser } = samples[0].state
    expect(hotwellLevel(Condenser.hotwellWaterVolume)).toBeGreaterThan(HotwellLowLow)
    expect(Condenser.condensationPumpValvePosition).toBeGreaterThan(0)
    expect(Condenser.makeupValvePosition).toBe(0)
    expect(Condenser.rejectValvePosition).toBe(1)
  })

  test("the condensation pump trips as the level crosses low-low, within a second", () => {
    const crossedAt = firstTimeWhere(samples, (s) => hotwellLevel(s.Condenser.hotwellWaterVolume) < HotwellLowLow)
    expect(trippedAt).toBeDefined()
    expect(crossedAt).toBeDefined()
    expect((trippedAt ?? Infinity) - (crossedAt ?? 0)).toBeLessThanOrEqual(hotwellLow.sampleEvery)
    for (const { state } of samples.filter((s) => s.time < (crossedAt ?? 0)))
      expect(state.Condenser.condensationPumpTripped).toBe(false)
  })

  test("the low level alarm is on before the pump trips, at or before the crossing of low-low", () => {
    const alarmAt = firstTimeWhere(samples, (s) => activeAlarms(s).includes("hotwellLevelLow"))
    const crossedAt = firstTimeWhere(samples, (s) => hotwellLevel(s.Condenser.hotwellWaterVolume) < HotwellLowLow)
    expect(alarmAt).toBeDefined()
    expect(alarmAt ?? Infinity).toBeLessThanOrEqual(crossedAt ?? 0)
    expect(alarmAt ?? Infinity).toBeLessThan(trippedAt ?? 0)
  })

  test("a tripped pump has its valve shut and returns nothing", () => {
    for (const { state } of samples.filter((s) => s.time >= (trippedAt ?? Infinity))) {
      expect(state.Condenser.condensationPumpValvePosition).toBe(0)
      expect(state.Condenser.returnRate).toBe(0)
    }
  })
})
