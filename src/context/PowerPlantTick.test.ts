import { describe, expect, test } from "vitest"
import { CstSimulation } from "./const"
import PowerPlantState from "./PowerPlantState"
import PowerPlantTick from "./PowerPlantTick"
import { makeInitialState } from "./PowerPlantReducer"

const { CstBoiler } = CstSimulation
const cold = makeInitialState()
const pumping = (boilerWater: number, hotwell = cold.Condenser.hotwellWaterVolume): PowerPlantState => ({
  ...cold,
  Boiler: { ...cold.Boiler, waterVolume: boilerWater },
  Condenser: { ...cold.Condenser, hotwellWaterVolume: hotwell, condensationPumpValvePosition: 1 },
})

describe("PowerPlantTick return", () => {
  test("the boiler receives the return in the same tick the hotwell gives it", () => {
    // full pump: 300 l/s for one 0.1 s tick
    const next = PowerPlantTick(pumping(50_000, 10_000))
    expect(next.Condenser.returnRate).toBe(30)
    expect(next.Condenser.hotwellWaterVolume).toBe(9_970)
    expect(next.Boiler.waterVolume).toBeCloseTo(50_030, 2)
  })

  test("a full boiler takes no return, the water stays in the hotwell", () => {
    const next = PowerPlantTick(pumping(CstBoiler.TotalVolume, 10_000))
    expect(next.Condenser.returnRate).toBe(0)
    expect(next.Condenser.hotwellWaterVolume).toBe(10_000)
    expect(next.Boiler.waterVolume).toBe(CstBoiler.TotalVolume)
  })

  test("a nearly full boiler is filled to capacity, not past it", () => {
    const next = PowerPlantTick(pumping(CstBoiler.TotalVolume - 5, 10_000))
    expect(next.Condenser.returnRate).toBe(5)
    expect(next.Boiler.waterVolume).toBe(CstBoiler.TotalVolume)
  })

  test("an empty hotwell returns nothing", () => {
    const next = PowerPlantTick(pumping(50_000, 0))
    expect(next.Condenser.returnRate).toBe(0)
    expect(next.Boiler.waterVolume).toBeCloseTo(50_000, 2)
  })
})

describe("PowerPlantTick dry boiler", () => {
  test("makes no steam from water that is not there", () => {
    const dry: PowerPlantState = {
      ...cold,
      Boiler: { ...cold.Boiler, waterVolume: 0, steamMass: 0, temperature: 100, gasFlow: CstBoiler.MaxGasFlow },
    }
    const next = PowerPlantTick(dry)
    expect(next.Boiler.deltaSteamMass).toBe(0)
    expect(next.Boiler.steamMass).toBe(0)
    expect(next.Boiler.waterVolume).toBe(0)
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
