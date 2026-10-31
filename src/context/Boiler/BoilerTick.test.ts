import { describe, expect, test } from "vitest"
import BoilerTick, { BoilerRemoveSteam } from "./BoilerTick"
import { CstPhysics, CstSimulation } from "../const"
import { makeInitialState } from "../PowerPlantReducer"

const { CstBoiler, DeltaTime } = CstSimulation
const cold = makeInitialState().Boiler

describe("BoilerTick drain", () => {
  test("closed drain keeps the totalizer at 0", () => {
    expect(BoilerTick(cold).drainedTotal).toBe(0)
  })

  test("open drain removes water and counts it in the totalizer", () => {
    const drained = BoilerTick({ ...cold, drainValveOpen: true })
    const amount = CstBoiler.TotalVolume * CstBoiler.DrainingRate * DeltaTime
    expect(drained.drainedTotal).toBeCloseTo(amount)
    expect(drained.waterVolume).toBeCloseTo(cold.waterVolume - amount)
  })

  test("counts only the water actually drained from a nearly empty boiler", () => {
    const drained = BoilerTick({ ...cold, waterVolume: 10, drainValveOpen: true, drainedTotal: 5 })
    expect(drained.drainedTotal).toBe(15)
    expect(drained.waterVolume).toBe(0)
  })
})

describe("BoilerTick natural cooling", () => {
  const { AmbientTemperature } = CstPhysics

  test("loses no energy at ambient", () => {
    const next = BoilerTick(cold)
    expect(next.energy).toBe(cold.energy)
    expect(next.temperature).toBe(AmbientTemperature)
  })

  test("cools a full step when well above ambient", () => {
    const warm = BoilerTick({ ...cold, temperature: 60 })
    expect(warm.temperature).toBeCloseTo(60 - CstBoiler.CoolingRate * DeltaTime)
  })

  test("stops at ambient, losing only the energy above it", () => {
    const justAbove = AmbientTemperature + 0.001 // less than one tick of cooling
    const next = BoilerTick({ ...cold, temperature: justAbove })
    expect(next.temperature).toBeCloseTo(AmbientTemperature, 9)
    expect(cold.energy - next.energy).toBeLessThan(cold.waterVolume * 4.2 * 0.001)
  })
})

describe("BoilerTick steam generation", () => {
  const boiling = { ...cold, temperature: 100, pressure: CstPhysics.AtmosphericPressure_mBar / 1e3 }

  test("makes no steam with the gas off, even at the boiling point", () => {
    const next = BoilerTick({ ...boiling, gasFlow: 0 })
    expect(next.deltaSteamMass).toBe(0)
    expect(next.steamMass).toBe(boiling.steamMass)
  })

  test("makes no steam while the water is below boiling", () => {
    const next = BoilerTick({ ...cold, temperature: 60, gasFlow: CstBoiler.MaxGasFlow })
    expect(next.deltaSteamMass).toBe(0)
    expect(next.temperature).toBeGreaterThan(60)
  })

  test("steam rate scales with the actual gas flow", () => {
    const half = BoilerTick({ ...boiling, gasFlow: CstBoiler.MaxGasFlow / 2 }).deltaSteamMass
    const full = BoilerTick({ ...boiling, gasFlow: CstBoiler.MaxGasFlow }).deltaSteamMass
    expect(half).toBeGreaterThan(0)
    expect(full / half).toBeGreaterThan(1.8)
    expect(full / half).toBeLessThan(2.5)
  })

  test("the water stays at the boiling point while it makes steam", () => {
    expect(BoilerTick({ ...boiling, gasFlow: CstBoiler.MaxGasFlow }).temperature).toBeCloseTo(100, 1)
  })
})

describe("BoilerRemoveSteam", () => {
  const plant = makeInitialState()
  const openTurbine = { ...plant.Turbine, mainSteamValve: true, turbineValvePosition: 0.5 }

  test("caps the flow at the valve rate when the boiler holds plenty of steam", () => {
    // 50% of 200 kg/s for 0.1 s is 10 kg
    const { boilerState, turbineState } = BoilerRemoveSteam(
      { ...plant.Boiler, steamMass: 1000 },
      openTurbine,
      "TURBINE",
    )
    expect(turbineState.turbineSteamFlowOut).toBeCloseTo(100)
    expect(boilerState.steamMass).toBeCloseTo(990)
  })

  test("removes only the steam the boiler holds when the valve asks for more", () => {
    const { boilerState, turbineState } = BoilerRemoveSteam(
      { ...plant.Boiler, steamMass: 2 },
      openTurbine,
      "TURBINE",
    )
    expect(boilerState.steamMass).toBe(0)
    expect(turbineState.turbineSteamFlowOut).toBeCloseTo(20)
  })

  test("bypass and turbine draw from the same steam", () => {
    const both = { ...openTurbine, bypassValvePosition: 0.5 }
    const bypass = BoilerRemoveSteam({ ...plant.Boiler, steamMass: 15 }, both, "BYPASS")
    const turbine = BoilerRemoveSteam(bypass.boilerState, bypass.turbineState, "TURBINE")
    // 10 kg through the bypass leaves 5 kg for the turbine
    expect(turbine.turbineState.bypassSteamFlowOut).toBeCloseTo(100)
    expect(turbine.turbineState.turbineSteamFlowOut).toBeCloseTo(50)
    expect(turbine.boilerState.steamMass).toBe(0)
  })

  test("a closed main steam valve removes nothing", () => {
    const boiler = { ...plant.Boiler, steamMass: 50 }
    const { boilerState, turbineState } = BoilerRemoveSteam(
      boiler,
      { ...openTurbine, mainSteamValve: false },
      "TURBINE",
    )
    expect(boilerState.steamMass).toBe(50)
    expect(turbineState.turbineSteamFlowOut).toBe(0)
  })
})
