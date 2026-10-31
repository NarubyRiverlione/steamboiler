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
    expect(next.Boiler.waterVolume).toBe(50_030)
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
    expect(next.Boiler.waterVolume).toBe(50_000)
  })
})

describe("PowerPlantTick dry boiler", () => {
  test("makes no steam from water that is not there", () => {
    const dry: PowerPlantState = {
      ...cold,
      Boiler: { ...cold.Boiler, waterVolume: 0, temperature: 100, gasFlow: CstBoiler.MaxGasFlow },
    }
    const next = PowerPlantTick(dry)
    expect(next.Boiler.deltaSteamMass).toBe(0)
    expect(next.Boiler.steamMass).toBe(0)
    expect(next.Boiler.waterVolume).toBe(0)
  })
})
