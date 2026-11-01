import { describe, expect, test } from "vitest"
import {
  calculateBoilerPressure,
  calculateHeatingEnergy,
  findRoot,
  roomInKg,
  waterMassOf,
  waterVolumeOf,
} from "./boilerCalculations"

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

describe("water mass, volume and room", () => {
  // 1 m³ of water: 998 kg at 20 °C and about 958 kg at 100 °C (textbook density)
  test("a volume holds the mass given by the specific volume at its temperature", () => {
    expect(waterMassOf(1000, 20)).toBeCloseTo(998.2, 0)
    expect(waterMassOf(1000, 100)).toBeCloseTo(958.4, 0)
  })

  test("volume and mass convert back and forth", () => {
    expect(waterVolumeOf(waterMassOf(1234, 150), 150)).toBeCloseTo(1234, 6)
  })

  test("room is the free volume in kg at the water temperature, and never negative", () => {
    expect(roomInKg(1000, 400, 100)).toBeCloseTo(575, 0)
    expect(roomInKg(1000, 1200, 100)).toBe(0)
  })
})
