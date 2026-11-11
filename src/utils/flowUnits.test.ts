import { describe, expect, it } from "vitest"
import { waterMassOf } from "./boilerCalculations"
import { waterKgPerSecond } from "./flowUnits"

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
