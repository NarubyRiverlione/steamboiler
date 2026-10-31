import { describe, expect, test } from "vitest"
import BoilerTick, { BoilerRemoveSteam, drainBoiler, valvePositionFor, warmBy, waterMassOf } from "./BoilerTick"
import { CstPhysics, CstSimulation } from "../const"
import { makeInitialState } from "../PowerPlantReducer"
import { calculateBoilerPressure, calculateSteamInventory } from "../../utils/boilerCalculations"

const { CstBoiler, CstTurbine, DeltaTime } = CstSimulation
const cold = makeInitialState().Boiler

// Water at a temperature with its steam space in equilibrium, as a plant that has rested there
const settled = (temperature: number) => ({
  ...cold,
  temperature,
  pressure: calculateBoilerPressure(temperature),
  steamMass: calculateSteamInventory(temperature, cold.waterVolume),
})

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
    expect(next.energy).toBeCloseTo(cold.energy, 2)
    expect(next.temperature).toBeCloseTo(AmbientTemperature, 9)
  })

  test("cools a full step when well above ambient", () => {
    const warm = BoilerTick(settled(60))
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
  const boiling = settled(100)

  test("makes no steam with the gas off, even at the boiling point", () => {
    const next = BoilerTick({ ...boiling, gasFlow: 0 })
    expect(next.deltaSteamMass).toBeLessThanOrEqual(0)
    expect(next.steamMass).toBeLessThanOrEqual(boiling.steamMass)
  })

  test("makes next to no steam while the water is well below boiling", () => {
    const next = BoilerTick({ ...settled(60), gasFlow: CstBoiler.MaxGasFlow })
    expect(next.deltaSteamMass).toBeLessThan(0.5)
    expect(next.temperature).toBeGreaterThan(60)
  })

  test("steam rate scales with the actual gas flow", () => {
    const warm = settled(120)
    const half = BoilerTick({ ...warm, gasFlow: CstBoiler.MaxGasFlow / 2 }).deltaSteamMass
    const full = BoilerTick({ ...warm, gasFlow: CstBoiler.MaxGasFlow }).deltaSteamMass
    expect(half).toBeGreaterThan(0)
    expect(full / half).toBeGreaterThan(1.8)
    expect(full / half).toBeLessThan(2.5)
  })

  test("the closed drum keeps heating past the atmospheric boiling point", () => {
    expect(BoilerTick({ ...boiling, gasFlow: CstBoiler.MaxGasFlow }).temperature).toBeGreaterThan(100.1)
  })
})

describe("steam draw cools the boiler", () => {
  const plant = makeInitialState()
  const openTurbine = { ...plant.Turbine, mainSteamValve: true, turbineValvePosition: 0.5 }
  const hot = settled(250)

  test("drawing steam lowers temperature and pressure, the flash takes its latent heat from the water", () => {
    const drawn = BoilerRemoveSteam(hot, openTurbine, "TURBINE")
    const after = BoilerTick(drawn.boilerState)
    const rest = BoilerTick(hot)
    expect(after.temperature).toBeLessThan(rest.temperature)
    expect(after.pressure).toBeLessThan(rest.pressure)
    // 10 kg out in a tick, each kg needs about 1700 kJ from tens of tonnes of water: a fraction of a kelvin
    expect(rest.temperature - after.temperature).toBeGreaterThan(0.01)
    expect(rest.temperature - after.temperature).toBeLessThan(1)
  })

  test("the flash restores the steam inventory the draw took", () => {
    const after = BoilerTick(BoilerRemoveSteam(hot, openTurbine, "TURBINE").boilerState)
    expect(after.steamMass).toBeGreaterThan(hot.steamMass * 0.99)
    expect(after.deltaSteamMass).toBeGreaterThan(0)
  })
})

describe("BoilerRemoveSteam", () => {
  const plant = makeInitialState()
  const openTurbine = { ...plant.Turbine, mainSteamValve: true, turbineValvePosition: 0.5 }
  // A half-open valve passes half the rated steam flow (kg/s), so this much per tick
  const halfOpenFlow = 0.5 * CstTurbine.MaxSteamRemovalRate
  const halfOpenPerTick = halfOpenFlow * DeltaTime

  test("caps the flow at the valve rate when the boiler holds plenty of steam", () => {
    const plenty = 100 * halfOpenPerTick
    const { boilerState, turbineState } = BoilerRemoveSteam(
      { ...plant.Boiler, steamMass: plenty },
      openTurbine,
      "TURBINE",
    )
    expect(turbineState.turbineSteamFlowOut).toBeCloseTo(halfOpenFlow)
    expect(boilerState.steamMass).toBeCloseTo(plenty - halfOpenPerTick)
  })

  test("removes only the steam the boiler holds when the valve asks for more", () => {
    const little = halfOpenPerTick / 5
    const { boilerState, turbineState } = BoilerRemoveSteam(
      { ...plant.Boiler, steamMass: little },
      openTurbine,
      "TURBINE",
    )
    expect(boilerState.steamMass).toBe(0)
    expect(turbineState.turbineSteamFlowOut).toBeCloseTo(halfOpenFlow / 5)
  })

  test("bypass and turbine draw from the same steam", () => {
    const both = { ...openTurbine, bypassValvePosition: 0.5 }
    // One tick's worth through the bypass leaves half a tick's worth for the turbine
    const bypass = BoilerRemoveSteam({ ...plant.Boiler, steamMass: 1.5 * halfOpenPerTick }, both, "BYPASS")
    const turbine = BoilerRemoveSteam(bypass.boilerState, bypass.turbineState, "TURBINE")
    expect(turbine.turbineState.bypassSteamFlowOut).toBeCloseTo(halfOpenFlow)
    expect(turbine.turbineState.turbineSteamFlowOut).toBeCloseTo(halfOpenFlow / 2)
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

describe("BoilerTick pressure law", () => {
  const atmospheric = CstPhysics.AtmosphericPressure_mBar / 1e3
  // Saturated water in equilibrium with its steam: the steam space holds its saturated inventory

  // Textbook saturation pressures: 150 °C = 4.76 bar, 250 °C = 39.7 bar
  test("pressure is the saturation pressure of the water temperature", () => {
    expect(BoilerTick(settled(150)).pressure).toBeCloseTo(4.76, 1)
    expect(BoilerTick(settled(250)).pressure).toBeCloseTo(39.7, 0)
  })

  test("pressure never drops below atmospheric, even for cold water", () => {
    expect(BoilerTick(cold).pressure).toBeCloseTo(atmospheric, 5)
    expect(BoilerTick({ ...cold, temperature: 60 }).pressure).toBeCloseTo(atmospheric, 5)
  })

  // Textbook saturated steam density: 0.598 kg/m³ at 100 °C, 2.55 at 150, 19.95 at 250, 46.2 at 300
  test("the steam space holds saturated steam at the water temperature", () => {
    const steamSpace = (CstBoiler.TotalVolume - cold.waterVolume) / 1000
    const density = (temperature: number) => BoilerTick(settled(temperature)).steamMass / steamSpace
    const withinPercent = (value: number, expected: number) => Math.abs(value / expected - 1) < 0.03
    expect(withinPercent(density(100), 0.598)).toBe(true)
    expect(withinPercent(density(150), 2.55)).toBe(true)
    expect(withinPercent(density(250), 19.95)).toBe(true)
    expect(withinPercent(density(300), 46.2)).toBe(true)
  })

  test("heat beyond the atmospheric boiling point raises temperature and pressure", () => {
    const hot = settled(120)
    const next = BoilerTick({ ...hot, gasFlow: CstBoiler.MaxGasFlow })
    expect(next.temperature).toBeGreaterThan(120)
    expect(next.pressure).toBeGreaterThan(BoilerTick(hot).pressure)
  })

  test("with the gas off and the steam in equilibrium, pressure falls with the temperature", () => {
    const next = BoilerTick(settled(150))
    expect(next.temperature).toBeLessThan(150)
    expect(next.pressure).toBeLessThan(settled(150).pressure)
  })
})

describe("BoilerTick helpers", () => {
  test("an open drain on an empty boiler drains nothing and loses no energy", () => {
    expect(drainBoiler({ ...cold, waterVolume: 0, drainValveOpen: true })).toEqual({
      waterVolume: 0,
      drained: 0,
      energyLoss: 0,
    })
  })

  test("the drain takes the same share of the energy as of the water", () => {
    const drain = drainBoiler({ ...cold, drainValveOpen: true })
    expect(drain.energyLoss / cold.energy).toBeCloseTo(drain.drained / cold.waterVolume, 9)
  })

  // 1 m³ of water: 1000 kg cold, about 958 kg at 100 °C (textbook density)
  test("water mass follows the density at the water temperature", () => {
    expect(waterMassOf(1000, 20)).toBe(1000)
    expect(waterMassOf(1000, 100)).toBeCloseTo(958, -1)
  })

  test("an empty boiler (no heat capacity) keeps its temperature", () => {
    expect(warmBy(150, 1e6, 0)).toBe(150)
    expect(warmBy(150, 1000, 100)).toBe(160)
  })

  test("the vent has no valve yet, so it passes nothing", () => {
    const open = { ...makeInitialState().Turbine, bypassValvePosition: 1, turbineValvePosition: 1 }
    expect(valvePositionFor(open, "VENT")).toBe(0)
    const { boilerState, turbineState } = BoilerRemoveSteam(
      { ...cold, steamMass: 50 },
      { ...open, mainSteamValve: true },
      "VENT",
    )
    expect(boilerState.steamMass).toBe(50)
    expect(turbineState).toEqual({ ...open, mainSteamValve: true })
  })
})
