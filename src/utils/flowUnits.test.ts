import { describe, expect, it } from "vitest"
import { CstFlueGas } from "../context/const"
import { waterMassOf } from "./boilerCalculations"
import { gasKgPerSecond, waterKgPerSecond } from "./flowUnits"

describe("waterKgPerSecond", () => {
  it("is the litres the water holds at its temperature as kg", () => {
    expect(waterKgPerSecond(300, 40)).toBeCloseTo(waterMassOf(300, 40), 9)
  })

  it("gives less kg for the same litres of hotter water", () => {
    expect(waterKgPerSecond(300, 134)).toBeLessThan(waterKgPerSecond(300, 20))
  })

  it("is zero for no flow", () => {
    expect(waterKgPerSecond(0, 80)).toBe(0)
  })
})

describe("gasKgPerSecond", () => {
  it("uses the mass per gas volume of the simulation", () => {
    expect(gasKgPerSecond(12000)).toBeCloseTo(12 * CstFlueGas.MassPerGasVolume, 9)
  })

  it("is zero for no flow", () => {
    expect(gasKgPerSecond(0)).toBe(0)
  })
})
