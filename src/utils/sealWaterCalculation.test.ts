import { describe, expect, test } from "vitest"
import { CstSimulation } from "../context/const"
import {
  capacityFraction,
  isSealWaterTrip,
  isSealWaterWarning,
  sealWaterFloor,
  sealWaterTemperatureAfter,
} from "./sealWaterCalculation"

const { CstCondenser, DeltaTime } = CstSimulation

describe("seal water (#166)", () => {
  test("the floor is the vapour pressure of the seal water and rises with its temperature", () => {
    expect(sealWaterFloor(20)).toBeGreaterThan(22)
    expect(sealWaterFloor(20)).toBeLessThan(24)
    expect(sealWaterFloor(55)).toBeGreaterThan(sealWaterFloor(40))
  })

  test("the capacity falls to nothing at the floor and is nearly full far above it", () => {
    expect(capacityFraction(20, sealWaterFloor(20))).toBe(0)
    expect(capacityFraction(20, 10)).toBe(0)
    expect(capacityFraction(20, 1013)).toBeGreaterThan(0.97)
    expect(capacityFraction(20, 0)).toBe(0)
  })

  test("a stopped pump adds no heat and the cooler still cools", () => {
    const next: number = sealWaterTemperatureAfter(30, false, 0, 25, 21, true)
    expect(next).toBeLessThan(30)
  })

  test("a running pump with the cooler lost only heats the water", () => {
    const next: number = sealWaterTemperatureAfter(30, true, 0.3, 25, 21, false)
    expect(next - 30).toBeGreaterThan((CstCondenser.CAR_ShaftPower * DeltaTime) / (CstCondenser.CAR_SealWaterMass * 4.18) * 0.99)
  })

  test("with the cooler working the water settles near 20 °C and stays under the warning", () => {
    let temperature = 10
    for (let i = 0; i < 200000; i++) temperature = sealWaterTemperatureAfter(temperature, true, 0.3, 25, 21, true)
    expect(temperature).toBeGreaterThan(18)
    expect(temperature).toBeLessThan(25)
    expect(isSealWaterWarning(temperature)).toBe(false)
  })

  test("a pump stalled at its floor still takes its shaft power", () => {
    expect(sealWaterTemperatureAfter(30, true, 0, 25, 21, false)).toBeGreaterThan(30)
  })

  test("the warning comes before the trip", () => {
    expect(isSealWaterWarning(CstCondenser.CAR_SealWaterWarning)).toBe(true)
    expect(isSealWaterTrip(CstCondenser.CAR_SealWaterWarning)).toBe(false)
    expect(isSealWaterTrip(CstCondenser.CAR_SealWaterTrip)).toBe(true)
  })
})
