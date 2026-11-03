import { describe, expect, test } from "vitest"
import { CstPhysics, CstSimulation } from "./const"
import { getWaterSpecificVolume } from "../utils/steamTable"
import { calculateSteamInventory } from "../utils/boilerCalculations"
import PowerPlantState from "./PowerPlantState"
import PowerPlantTick from "./PowerPlantTick"
import { makeInitialState } from "./PowerPlantReducer"

const { CstBoiler } = CstSimulation
const cold = makeInitialState()
const { AmbientTemperature } = CstPhysics
const litresPerKg: number = getWaterSpecificVolume(AmbientTemperature)

// A plant at ambient holding this much water (litres) in the boiler and hotwell, the condensation pump full open
const pumping = (boilerLitres: number, hotwellLitres = cold.Condenser.hotwellWaterVolume): PowerPlantState => ({
  ...cold,
  Boiler: {
    ...cold.Boiler,
    waterMass: boilerLitres / litresPerKg,
    waterVolume: boilerLitres,
    steamMass: calculateSteamInventory(AmbientTemperature, boilerLitres), // in equilibrium with the steam space
  },
  Condenser: {
    ...cold.Condenser,
    hotwellWaterMass: hotwellLitres / litresPerKg,
    hotwellWaterVolume: hotwellLitres,
    condensationPumpValvePosition: 1,
  },
})

describe("PowerPlantTick return", () => {
  test("the boiler receives the return in the same tick the hotwell gives it", () => {
    // full pump: 300 l/s for one 0.1 s tick = 30 L = 29.946 kg at 20 °C
    const start = pumping(50_000, 10_000)
    const next = PowerPlantTick(start)
    expect(next.Condenser.returnRate).toBeCloseTo(30 / litresPerKg, 6)
    expect(next.Condenser.hotwellWaterMass).toBeCloseTo(start.Condenser.hotwellWaterMass - 30 / litresPerKg, 6)
    expect(next.Boiler.waterMass).toBeCloseTo(start.Boiler.waterMass + 30 / litresPerKg, 2)
  })

  test("a full boiler takes no return, the water stays in the hotwell", () => {
    const start = pumping(CstBoiler.TotalVolume, 10_000)
    const next = PowerPlantTick(start)
    expect(next.Condenser.returnRate).toBe(0)
    expect(next.Condenser.hotwellWaterMass).toBe(start.Condenser.hotwellWaterMass)
    expect(next.Boiler.waterVolume).toBeCloseTo(CstBoiler.TotalVolume, 2)
  })

  test("a nearly full boiler is filled to capacity, not past it", () => {
    const next = PowerPlantTick(pumping(CstBoiler.TotalVolume - 5, 10_000))
    expect(next.Condenser.returnRate).toBeCloseTo(5 / litresPerKg, 6)
    expect(next.Boiler.waterVolume).toBeCloseTo(CstBoiler.TotalVolume, 2)
  })

  test("an empty hotwell returns nothing", () => {
    const start = pumping(50_000, 0)
    const next = PowerPlantTick(start)
    expect(next.Condenser.returnRate).toBe(0)
    expect(next.Boiler.waterMass).toBeCloseTo(start.Boiler.waterMass, 2)
  })

  test("a hot boiler has less room: the same free volume takes fewer kg", () => {
    const hot = pumping(CstBoiler.TotalVolume - 5, 10_000)
    const hotBoiler: PowerPlantState = {
      ...hot,
      Boiler: { ...hot.Boiler, temperature: 300, waterMass: (CstBoiler.TotalVolume - 5) / getWaterSpecificVolume(300), waterVolume: CstBoiler.TotalVolume - 5, steamMass: calculateSteamInventory(300, CstBoiler.TotalVolume - 5) },
    }
    expect(PowerPlantTick(hotBoiler).Condenser.returnRate).toBeCloseTo(5 / getWaterSpecificVolume(300), 4)
  })
})

describe("PowerPlantTick dry boiler", () => {
  test("makes no steam from water that is not there", () => {
    const dry: PowerPlantState = {
      ...cold,
      Boiler: { ...cold.Boiler, waterMass: 0, waterVolume: 0, steamMass: 0, temperature: 100, gasFlow: CstBoiler.MaxGasFlow },
    }
    const next = PowerPlantTick(dry)
    expect(next.Boiler.deltaSteamMass).toBe(0)
    expect(next.Boiler.steamMass).toBe(0)
    expect(next.Boiler.waterMass).toBe(0)
  })
})

describe("PowerPlantTick turbine exhaust", () => {
  test("the condenser receives the steam through the turbine valve in the same tick", () => {
    // 5% of 200 kg/s for one 0.1 s tick = 1 kg; recirculation off so none of it condenses yet
    const turbineOpen: PowerPlantState = {
      ...cold,
      Boiler: { ...cold.Boiler, steamMass: 1_000 },
      Turbine: { ...cold.Turbine, mainSteamValve: true, turbineValvePosition: 0.05, turbineSteamFlowOut: 0 },
      Condenser: { ...cold.Condenser, steamMass: 0, recirculationPumpValvePosition: 0 },
    }
    const next = PowerPlantTick(turbineOpen)
    expect(next.Turbine.turbineSteamFlowOut).toBeCloseTo(10, 9)
    expect(next.Condenser.steamMass).toBeCloseTo(1, 9)
  })
})

describe("PowerPlantTick relief valve", () => {
  // At 178 bar with the main steam valve closed, as after a heat-up with everything shut
  const atLift: PowerPlantState = {
    ...cold,
    Boiler: { ...cold.Boiler, temperature: 356, pressure: 178, steamMass: 8000, waterMass: 37_600 / getWaterSpecificVolume(356), waterVolume: 37_600 },
  }

  test("vents to the atmosphere with the main steam valve closed", () => {
    const next = PowerPlantTick(atLift)
    expect(next.Boiler.reliefValveOpen).toBe(true)
    expect(next.Boiler.ventedTotal).toBeGreaterThan(0)
    expect(next.Boiler.reliefLifts).toBe(1)
  })

  test("vented steam never reaches the condenser", () => {
    const next = PowerPlantTick(atLift)
    expect(next.Condenser.intakeFlowRate).toBe(0)
    expect(next.Condenser.steamMass).toBe(0)
  })
})

describe("PowerPlantTick turbine trip", () => {
  const running = (condenserPressure: number): PowerPlantState => ({
    ...cold,
    Boiler: { ...cold.Boiler, pressure: 50 },
    Condenser: { ...cold.Condenser, pressure: condenserPressure },
    Turbine: { ...cold.Turbine, mainSteamValve: true, turbineValvePosition: 0.3 },
  })

  test("the turbine trips on the condenser pressure going into the tick", () => {
    const next = PowerPlantTick(running(CstSimulation.CstCondenser.VacuumLimit + 1))
    expect(next.Turbine.turbineValvePosition).toBe(0)
    expect(next.Turbine.turbineTripped).toBe(true)
  })

  test("under vacuum the turbine keeps its valve", () => {
    const next = PowerPlantTick(running(CstSimulation.CstCondenser.VacuumLimit))
    expect(next.Turbine.turbineValvePosition).toBe(0.3)
    expect(next.Turbine.turbineTripped).toBe(false)
  })
})

describe("PowerPlantTick burner trip", () => {
  // A burning plant holding this much water (litres) in the boiler
  const burning = (boilerLitres: number): PowerPlantState => {
    const plant: PowerPlantState = pumping(boilerLitres, 0)
    return { ...plant, Boiler: { ...plant.Boiler, gasFlow: CstBoiler.MaxGasFlow } }
  }
  const litresAtLevel = (level: number): number => CstBoiler.TotalVolume * level

  test("the gas goes to 0 and the trip is set when the water is below the burner low-low level", () => {
    const next = PowerPlantTick(burning(litresAtLevel(CstBoiler.BurnerLowLowLevel) - 1))
    expect(next.Boiler.gasFlow).toBe(0)
    expect(next.Boiler.burnerTripped).toBe(true)
  })

  test("the gas keeps burning at the burner low-low level", () => {
    const next = PowerPlantTick(burning(litresAtLevel(CstBoiler.BurnerLowLowLevel)))
    expect(next.Boiler.gasFlow).toBe(CstBoiler.MaxGasFlow)
    expect(next.Boiler.burnerTripped).toBe(false)
  })

  test("after a trip the gas stays 0 and the flag stays set, also once the water is back above the level", () => {
    let state: PowerPlantState = PowerPlantTick(burning(litresAtLevel(CstBoiler.BurnerLowLowLevel) - 1))
    state = { ...state, Boiler: { ...state.Boiler, waterVolume: litresAtLevel(CstBoiler.BurnerLowLowLevel) + 1000 } }
    for (let i = 0; i < 10; i++) state = PowerPlantTick(state)
    expect(state.Boiler.gasFlow).toBe(0)
    expect(state.Boiler.burnerTripped).toBe(true)
  })

  test("a drained boiler trips the burner", () => {
    const nearLow: PowerPlantState = burning(litresAtLevel(CstBoiler.BurnerLowLowLevel) + 100)
    let state: PowerPlantState = { ...nearLow, Boiler: { ...nearLow.Boiler, drainValveOpen: true } }
    for (let i = 0; i < 100 && !state.Boiler.burnerTripped; i++) state = PowerPlantTick(state)
    expect(state.Boiler.burnerTripped).toBe(true)
    expect(state.Boiler.gasFlow).toBe(0)
  })
})
