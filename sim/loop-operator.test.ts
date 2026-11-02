import { describe, expect, it } from "vitest"
import { CstSimulation } from "../src/context/const"
import { hotwellValvePositions, LoopSettings } from "./scenarios/loop-operator"

const { HotwellBandLow, HotwellBandHigh, HotwellRamp } = LoopSettings
const { HotwellLowLow, HotwellHighHigh } = CstSimulation.CstCondenser

describe("hotwellValvePositions", () => {
  it("the working band is 55 to 75% and the ramp is 15 points", () => {
    expect(HotwellBandLow).toBe(0.55)
    expect(HotwellBandHigh).toBe(0.75)
    expect(HotwellRamp).toBe(0.15)
  })

  it("holds both valves shut anywhere in the band, edges included", () => {
    for (const level of [HotwellBandLow, 0.6, 0.65, 0.7, HotwellBandHigh])
      expect(hotwellValvePositions(level)).toEqual({ makeup: 0, reject: 0 })
  })

  it("ramps makeup linearly below the band, fully open 15 points below it", () => {
    expect(hotwellValvePositions(0.475).makeup).toBeCloseTo(0.5)
    expect(hotwellValvePositions(0.4).makeup).toBe(1)
    expect(hotwellValvePositions(0.2)).toEqual({ makeup: 1, reject: 0 })
  })

  it("ramps reject linearly above the band, fully open 15 points above it", () => {
    expect(hotwellValvePositions(0.825).reject).toBeCloseTo(0.5)
    expect(hotwellValvePositions(0.9).reject).toBe(1)
    expect(hotwellValvePositions(0.99)).toEqual({ makeup: 0, reject: 1 })
  })

  it("is fully open well before the protections act", () => {
    expect(hotwellValvePositions(HotwellLowLow + 0.25).makeup).toBe(1)
    expect(hotwellValvePositions(HotwellHighHigh - 0.04).reject).toBe(1)
  })
})
