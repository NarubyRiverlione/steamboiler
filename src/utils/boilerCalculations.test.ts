import { describe, expect, test } from "vitest"
import { calculateBoilerPressure, calculateHeatingEnergy, findRoot } from "./boilerCalculations"

describe("calculateBoilerPressure", () => {
  test("is atmospheric at and below the atmospheric boiling point", () => {
    expect(calculateBoilerPressure(20)).toBeCloseTo(1.01325, 5)
    expect(calculateBoilerPressure(100)).toBeCloseTo(1.01325, 1)
  })

  test("is finite and follows saturation up to the critical point", () => {
    expect(calculateBoilerPressure(357)).toBeCloseTo(180, -1)
    expect(Number.isFinite(calculateBoilerPressure(500))).toBe(true)
  })
})

describe("calculateHeatingEnergy", () => {
  test("is positive when heating and negative when cooling", () => {
    expect(calculateHeatingEnergy(1000, 20, 100)).toBeGreaterThan(0)
    expect(calculateHeatingEnergy(1000, 100, 20)).toBeLessThan(0)
  })
})

describe("findRoot", () => {
  const falling = (x: number) => 3 - x // root at 3

  test("finds the root inside the bracket", () => {
    expect(findRoot(falling, 0, 10)).toBeCloseTo(3, 6)
  })

  test("returns the nearer end when the root lies beyond the bracket", () => {
    expect(findRoot(falling, 5, 10)).toBe(5)
    expect(findRoot(falling, -10, 1)).toBe(1)
  })
})
