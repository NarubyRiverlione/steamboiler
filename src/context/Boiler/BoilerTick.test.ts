import { describe, expect, test } from "vitest"
import BoilerTick from "./BoilerTick"
import { CstSimulation } from "../const"
import { makeInitialState } from "../PowerPlantReducer"

const { CstBoiler, DeltaTime } = CstSimulation
const cold = makeInitialState(20).Boiler

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
