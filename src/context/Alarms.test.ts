import { describe, expect, test } from "vitest"
import { activeAlarms, newAlarms } from "./Alarms"
import { CstPhysics, CstSimulation } from "./const"
import PowerPlantState from "./PowerPlantState"
import { makeInitialState } from "./PowerPlantReducer"
import { SimulationState, makeInitialSimulation, simulationReducer } from "./SimulationReducer"
import { waterMassOf } from "../utils/boilerCalculations"

const { TotalVolume, HotwellLow, HotwellHigh } = CstSimulation.CstCondenser

// A plant whose hotwell sits at the given fraction of its volume
const atLevel = (level: number, rejectValvePosition = 0): PowerPlantState => {
  const base: PowerPlantState = makeInitialState()
  return {
    ...base,
    Condenser: {
      ...base.Condenser,
      hotwellWaterVolume: level * TotalVolume,
      hotwellWaterMass: waterMassOf(level * TotalVolume, CstPhysics.AmbientTemperature),
      rejectValvePosition,
    },
  }
}

describe("hotwell level alarms", () => {
  test("the limits are 25% and 85%", () => {
    expect(HotwellLow).toBe(0.25)
    expect(HotwellHigh).toBe(0.85)
  })

  test.each([
    [HotwellLow - 0.001, true],
    [HotwellLow, false],
    [HotwellLow + 0.001, false],
  ])("low at level %f is active: %s (strictly below 25%%)", (level: number, on: boolean) => {
    expect(activeAlarms(atLevel(level)).includes("hotwellLevelLow")).toBe(on)
  })

  test.each([
    [HotwellHigh - 0.001, false],
    [HotwellHigh, true],
    [HotwellHigh + 0.001, true],
  ])("high at level %f is active: %s (from 85%%)", (level: number, on: boolean) => {
    expect(activeAlarms(atLevel(level)).includes("hotwellLevelHigh")).toBe(on)
  })

  test("neither is active in the working band", () => {
    expect(activeAlarms(atLevel(0.7))).toEqual([])
  })

  test("a newly raised alarm is reported once", () => {
    expect(newAlarms(atLevel(0.7), atLevel(0.2))).toEqual(["hotwellLevelLow"])
    expect(newAlarms(atLevel(0.2), atLevel(0.2))).toEqual([])
  })

  test("a newly raised hotwell alarm drops the playback from a higher speed to 1x, a pause stays a pause", () => {
    // Just above 25% with the reject open: it crosses within a few ticks
    const start = (speed: SimulationState["speed"]): SimulationState => ({ ...makeInitialSimulation(atLevel(HotwellLow + 0.0005, 1)), speed })
    const fast: SimulationState = simulationReducer(start(60), { type: "SIMULATE_TICKS", count: 600 })
    expect(activeAlarms(fast.plant)).toContain("hotwellLevelLow")
    expect(fast.speed).toBe(1)
    expect(simulationReducer(start(0), { type: "SIMULATE_TICKS", count: 600 }).speed).toBe(0)
  })
})
