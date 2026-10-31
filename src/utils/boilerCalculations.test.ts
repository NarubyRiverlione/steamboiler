import { describe, expect, test } from "vitest"
import { calculateEnergyBalance, calculateHeatingEnergy } from "./boilerCalculations"
import { getLatentHeat } from "./steamTable"

const Atmospheric = 1.01325 // bar, boiling point 100 °C
const Mass = 1000 // kg

describe("calculateEnergyBalance", () => {
  test("heats without steam when the energy is short of the boiling point", () => {
    const toBoil = calculateHeatingEnergy(Mass, 20, 100)
    const balance = calculateEnergyBalance(Mass, 20, Atmospheric, toBoil / 2)
    expect(balance.steamMass).toBe(0)
    expect(balance.newTemperature).toBeGreaterThan(20)
    expect(balance.newTemperature).toBeLessThan(100)
    expect(balance.heatingEnergy).toBe(toBoil / 2)
    expect(balance.vaporisationEnergy).toBe(0)
  })

  test("spends only the energy beyond the boiling point on vaporising", () => {
    const toBoil = calculateHeatingEnergy(Mass, 20, 100)
    const extra = 50_000
    const balance = calculateEnergyBalance(Mass, 20, Atmospheric, toBoil + extra)
    expect(balance.newTemperature).toBeCloseTo(100, 0)
    expect(balance.steamMass).toBeCloseTo(extra / getLatentHeat(balance.newTemperature), 1)
  })

  test("conserves energy: heating plus vaporisation equals the energy put in", () => {
    const energyIn = calculateHeatingEnergy(Mass, 20, 100) + 80_000
    const balance = calculateEnergyBalance(Mass, 20, Atmospheric, energyIn)
    expect(balance.heatingEnergy + balance.vaporisationEnergy).toBeCloseTo(energyIn)
  })

  test("makes no steam from no energy at the boiling point", () => {
    expect(calculateEnergyBalance(Mass, 100, Atmospheric, 0).steamMass).toBe(0)
  })

  test("never makes more steam than the water there is", () => {
    expect(calculateEnergyBalance(1, 100, Atmospheric, 1e9).steamMass).toBe(1)
  })

  test("returns the state unchanged for an empty boiler", () => {
    expect(calculateEnergyBalance(0, 50, Atmospheric, 1e6)).toEqual({
      newTemperature: 50,
      steamMass: 0,
      heatingEnergy: 0,
      vaporisationEnergy: 0,
    })
  })

  test("cools water that loses energy, without steam", () => {
    const balance = calculateEnergyBalance(Mass, 150, 5, -10_000)
    expect(balance.newTemperature).toBeLessThan(150)
    expect(balance.steamMass).toBe(0)
  })
})
