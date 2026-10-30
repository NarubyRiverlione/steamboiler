import { describe, expect, test } from "vitest"
import BoilerTick from "./BoilerTick"
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
