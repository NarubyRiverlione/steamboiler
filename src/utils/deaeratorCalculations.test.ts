import { describe, expect, it } from "vitest"
import { CstDeaerator } from "../context/const"
import { airMassInGasSpace, airPressureOf, gasVolumeOf, orificeFlow, saturationPressureOf, ventGasOf } from "./deaeratorCalculations"

describe("saturationPressureOf", () => {
  it("matches the steam tables at 20, 100 and 133.5 °C", () => {
    expect(saturationPressureOf(20)).toBeCloseTo(0.0234, 3)
    expect(saturationPressureOf(100)).toBeCloseTo(1.013, 2)
    expect(saturationPressureOf(133.5)).toBeCloseTo(3, 1)
  })

  it("has no step where the Antoine fit meets the steam table at 80 °C", () => {
    expect(Math.abs(saturationPressureOf(79.999) - saturationPressureOf(80))).toBeLessThan(0.002)
  })
})

describe("air in the gas space", () => {
  it("takes the water volume off the total volume", () => {
    expect(gasVolumeOf(57_000)).toBeCloseTo(93, 6)
  })

  it("converts a pressure to a mass and back", () => {
    const mass: number = airMassInGasSpace(0.99, 20, 57_000)
    expect(airPressureOf(mass, 20, 57_000)).toBeCloseTo(0.99, 9)
    expect(mass).toBeCloseTo(109.4, 0)
  })

  it("rises with the temperature at a fixed mass (P·V = m·R·T)", () => {
    expect(airPressureOf(100, 130, 57_000)).toBeGreaterThan(airPressureOf(100, 20, 57_000))
  })
})

describe("the vent gas", () => {
  it("is all air with no steam and all steam with no air", () => {
    expect(ventGasOf(1, 0, 20).airShare).toBe(1)
    expect(ventGasOf(0, 1, 100).airShare).toBe(0)
  })

  it("has the density of steam at 1 bar and 100 °C, about 0.6 kg/m³", () => {
    expect(ventGasOf(0, 1.013, 100).density).toBeCloseTo(0.59, 1)
  })
})

describe("orificeFlow", () => {
  it("passes nothing at or below atmospheric pressure", () => {
    expect(orificeFlow(CstDeaerator.StartUpVentArea, 1, 1.01325)).toBe(0)
    expect(orificeFlow(CstDeaerator.StartUpVentArea, 1, 0.5)).toBe(0)
  })

  it("grows with the area and with the pressure drop", () => {
    expect(orificeFlow(0.1, 1, 2)).toBeCloseTo(2 * orificeFlow(0.05, 1, 2), 9)
    expect(orificeFlow(0.1, 1, 3)).toBeGreaterThan(orificeFlow(0.1, 1, 2))
  })
})
