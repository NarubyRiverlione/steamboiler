import { describe, expect, test } from "vitest"
import { activeAlarms, newAlarms } from "./Alarms"
import { CstDeaerator, CstPhysics, CstSimulation } from "./const"
import { makeHotDeaerator } from "./Deaerator/DeaeratorTick"
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

describe("boiler level high alarm (#62)", () => {
  const { TotalVolume, HighLevel, HighHighLevel } = CstSimulation.CstBoiler
  const boilerAt = (level: number): PowerPlantState => {
    const base: PowerPlantState = makeInitialState()
    return { ...base, Boiler: { ...base.Boiler, waterVolume: level * TotalVolume, waterMass: waterMassOf(level * TotalVolume, CstPhysics.AmbientTemperature) } }
  }

  test("the limits are 65% and 70%", () => {
    expect(HighLevel).toBe(0.65)
    expect(HighHighLevel).toBe(0.7)
  })

  test.each([
    [HighLevel - 0.001, false],
    [HighLevel, true],
    [HighHighLevel, true],
  ])("at level %f the alarm is active: %s (from 65%%)", (level: number, on: boolean) => {
    expect(activeAlarms(boilerAt(level)).includes("boilerLevelHigh")).toBe(on)
  })

  test("the trip tile follows the flag, not the level", () => {
    const tripped: PowerPlantState = boilerAt(0.5)
    tripped.Boiler.boilerLevelHighTripped = true
    expect(activeAlarms(tripped)).toEqual(["boilerLevelHighTripped"])
    expect(activeAlarms(boilerAt(0.9))).not.toContain("boilerLevelHighTripped")
  })

  test("a newly raised alarm drops the playback from a higher speed to 1x, a pause stays a pause", () => {
    // Just below 65% with the feed pump open on a hot deaerator: the level crosses within a few ticks
    const start = (speed: SimulationState["speed"]): SimulationState => {
      const plant: PowerPlantState = boilerAt(HighLevel - 0.0005)
      return { ...makeInitialSimulation({ ...plant, Deaerator: { ...makeHotDeaerator(CstDeaerator.TotalVolume / 2), feedPumpValvePosition: 1 } }), speed }
    }
    const fast: SimulationState = simulationReducer(start(60), { type: "SIMULATE_TICKS", count: 60 })
    expect(activeAlarms(fast.plant)).toContain("boilerLevelHigh")
    expect(fast.speed).toBe(1)
    expect(simulationReducer(start(0), { type: "SIMULATE_TICKS", count: 60 }).speed).toBe(0)
  })
})

describe("boiler and deaerator level alarms (#137)", () => {
  const boiler = CstSimulation.CstBoiler
  const boilerAt = (level: number): PowerPlantState => {
    const base: PowerPlantState = makeInitialState()
    return { ...base, Boiler: { ...base.Boiler, waterVolume: level * boiler.TotalVolume } }
  }
  const deaeratorAt = (level: number, feedPumpTripped = false): PowerPlantState => {
    const base: PowerPlantState = makeInitialState()
    return { ...base, Deaerator: { ...base.Deaerator, waterVolume: level * CstDeaerator.TotalVolume, feedPumpTripped } }
  }

  test.each([
    [boiler.LowLevel - 0.001, true],
    [boiler.LowLevel, false],
    [boiler.WorkingLow, false],
  ])("boiler low at level %f is active: %s (strictly below 35%%)", (level: number, on: boolean) => {
    expect(activeAlarms(boilerAt(level))).toEqual(on ? ["boilerLevelLow"] : [])
  })

  test.each([
    [CstDeaerator.LowLevel - 0.001, true],
    [CstDeaerator.LowLevel, false],
  ])("deaerator low at level %f is active: %s (strictly below 25%%)", (level: number, on: boolean) => {
    expect(activeAlarms(deaeratorAt(level)).includes("deaeratorLevelLow")).toBe(on)
  })

  test.each([
    [CstDeaerator.HighLevel - 0.001, false],
    [CstDeaerator.HighLevel, true],
    [CstDeaerator.HighHighLevel, true],
  ])("deaerator high at level %f is active: %s (from 75%%)", (level: number, on: boolean) => {
    expect(activeAlarms(deaeratorAt(level)).includes("deaeratorLevelHigh")).toBe(on)
  })

  test("the feed pump trip row follows feedPumpTripped, not the level", () => {
    expect(activeAlarms(deaeratorAt(0.5, true))).toEqual(["feedPumpTripped"])
    expect(activeAlarms(deaeratorAt(0.05))).not.toContain("feedPumpTripped")
  })

  test("a newly raised deaerator high alarm or feed pump trip is reported once", () => {
    expect(newAlarms(deaeratorAt(0.5), deaeratorAt(CstDeaerator.HighLevel))).toEqual(["deaeratorLevelHigh"])
    expect(newAlarms(deaeratorAt(0.5), deaeratorAt(0.5, true))).toEqual(["feedPumpTripped"])
    expect(newAlarms(deaeratorAt(0.5, true), deaeratorAt(0.5, true))).toEqual([])
  })

  test("the cold start raises no alarm (the 35% cold fill is not below the 35% limit)", () => {
    const fresh: PowerPlantState = makeInitialState()
    expect(activeAlarms(fresh)).toEqual([])
  })

  test("a newly raised boiler low alarm drops the playback from a higher speed to 1x, a pause stays a pause", () => {
    // Just above 35% with the drain open: the level crosses within a few ticks
    const start = (speed: SimulationState["speed"]): SimulationState => {
      const plant: PowerPlantState = boilerAt(boiler.LowLevel + 0.0005)
      return { ...makeInitialSimulation({ ...plant, Boiler: { ...plant.Boiler, drainValveOpen: true } }), speed }
    }
    const fast: SimulationState = simulationReducer(start(60), { type: "SIMULATE_TICKS", count: 600 })
    expect(activeAlarms(fast.plant)).toContain("boilerLevelLow")
    expect(fast.speed).toBe(1)
    expect(simulationReducer(start(0), { type: "SIMULATE_TICKS", count: 600 }).speed).toBe(0)
  })

  test("a newly raised deaerator low alarm drops the playback from a higher speed to 1x, a pause stays a pause", () => {
    // Just above 25% on a hot deaerator with the feed pump open: the level crosses within a few ticks
    const start = (speed: SimulationState["speed"]): SimulationState => {
      const plant: PowerPlantState = makeInitialState()
      const deaerator = { ...makeHotDeaerator((CstDeaerator.LowLevel + 0.0005) * CstDeaerator.TotalVolume), feedPumpValvePosition: 1 }
      return { ...makeInitialSimulation({ ...plant, Deaerator: deaerator }), speed }
    }
    const fast: SimulationState = simulationReducer(start(60), { type: "SIMULATE_TICKS", count: 600 })
    expect(activeAlarms(fast.plant)).toContain("deaeratorLevelLow")
    expect(fast.speed).toBe(1)
    expect(simulationReducer(start(0), { type: "SIMULATE_TICKS", count: 600 }).speed).toBe(0)
  })
})
