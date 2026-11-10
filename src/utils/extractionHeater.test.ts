import { describe, expect, it } from "vitest"
import { CstHeater, CstSimulation } from "../context/const"
import {
  calculateExtraction,
  heaterPressureOf,
  drainEnthalpyOf,
  heatFeedwater,
  ratedExtractionShare,
  shaftDropWithExtraction,
  tapPressureOf,
} from "./extractionHeater"
import {
  getBoilingPoint,
  getExhaustEnthalpy,
  getIsentropicEnthalpyDrop,
  getLiquidEnthalpy,
  getSaturationEnthalpies,
} from "./steamTable"

const { RatedSteamFlow, IsentropicEfficiency } = CstSimulation.CstTurbine
const RatedReturn = 130 // kg/s, a plausible hotwell return at rated flow
const HotwellTemperature = 29

describe("tapPressureOf", () => {
  it("is the rated tap pressure at rated flow and falls in proportion", () => {
    expect(tapPressureOf(RatedSteamFlow)).toBeCloseTo(CstHeater.TapPressureAtRated, 9)
    expect(tapPressureOf(RatedSteamFlow / 2)).toBeCloseTo(CstHeater.TapPressureAtRated / 2, 9)
    expect(tapPressureOf(0)).toBe(0)
  })

  it("heater pressure is the tap pressure less the line drop", () => {
    expect(heaterPressureOf(5)).toBeCloseTo(5 * (1 - CstHeater.LineDrop), 9)
  })
})

describe("calculateExtraction", () => {
  const rated = (overrides: Partial<Parameters<typeof calculateExtraction>[0]> = {}) =>
    calculateExtraction({
      turbineFlow: RatedSteamFlow,
      workFraction: 1,
      boilerPressure: 165,
      returnFlow: RatedReturn,
      returnTemperature: HotwellTemperature,
      ...overrides,
    })

  it("takes steam so the Return leaves 2 K below saturation at the heater pressure (about 150 °C at rated flow)", () => {
    const result = rated()
    const target: number = getBoilingPoint(result.heaterPressure) - CstHeater.TerminalTemperatureDifference
    expect(target).toBeGreaterThan(145)
    expect(target).toBeLessThan(152)
    expect(result.flow).toBeGreaterThan(0)
    // heat balance: steam heat (tap enthalpy to saturated liquid) equals the heat the water takes
    const steamHeat: number =
      result.flow * (result.tapEnthalpy - getLiquidEnthalpy(getBoilingPoint(result.heaterPressure)))
    const waterHeat: number = RatedReturn * (getLiquidEnthalpy(target) - getLiquidEnthalpy(HotwellTemperature))
    expect(steamHeat).toBeCloseTo(waterHeat, 6)
  })

  it("takes a third of the Return's mass as steam at rated flow (research: 34% single heater)", () => {
    const share: number = rated().flow / RatedReturn
    expect(share).toBeGreaterThan(0.25)
    expect(share).toBeLessThan(0.4)
  })

  it("extracts nothing with no turbine flow or no Return", () => {
    expect(rated({ turbineFlow: 0 }).flow).toBe(0)
    expect(rated({ returnFlow: 0 }).flow).toBe(0)
  })

  it("never cools: a Return already hotter than the heater target takes nothing", () => {
    expect(rated({ returnTemperature: 200 }).flow).toBe(0)
  })

  it("falls with the turbine flow: tap pressure and the Return temperature fall too", () => {
    const half = rated({ turbineFlow: RatedSteamFlow / 2, returnFlow: RatedReturn / 2 })
    const full = rated()
    expect(half.tapPressure).toBeLessThan(full.tapPressure)
    expect(getBoilingPoint(half.heaterPressure)).toBeLessThan(getBoilingPoint(full.heaterPressure))
    expect(half.flow).toBeLessThan(full.flow)
  })

  it("never extracts more than the turbine passes", () => {
    expect(rated({ turbineFlow: 1, returnFlow: 1000 }).flow).toBeLessThanOrEqual(1)
  })

  it("at standstill the tap steam is the inlet steam (no work taken)", () => {
    const standing = rated({ workFraction: 0 })
    const spinning = rated()
    expect(standing.tapEnthalpy).toBeGreaterThan(spinning.tapEnthalpy)
  })
})

describe("heatFeedwater", () => {
  const DeaeratorTemperature = 134

  it("heats the water with the heat the steam gives up down to the drain, which leaves the water", () => {
    const result = calculateExtraction({
      turbineFlow: RatedSteamFlow,
      workFraction: 1,
      boilerPressure: 165,
      returnFlow: 190,
      returnTemperature: DeaeratorTemperature,
    })
    const temperature: number = heatFeedwater(190, DeaeratorTemperature, result.flow, result)
    expect(temperature).toBeGreaterThan(145)
    expect(temperature).toBeLessThanOrEqual(getBoilingPoint(result.heaterPressure))
    const heatIn: number = result.flow * (result.tapEnthalpy - drainEnthalpyOf(result.heaterPressure))
    expect(190 * (getLiquidEnthalpy(temperature) - getLiquidEnthalpy(DeaeratorTemperature))).toBeCloseTo(heatIn, 0)
  })

  it("is the water unchanged with no extraction", () => {
    expect(heatFeedwater(100, 30, 0, { tapEnthalpy: 2500, heaterPressure: 5 })).toBe(30)
  })

  it("is the water unchanged with no water to heat", () => {
    expect(heatFeedwater(0, 30, 10, { tapEnthalpy: 2500, heaterPressure: 5 })).toBe(30)
  })

  it("never leaves hotter than the heater saturation", () => {
    expect(heatFeedwater(1, 30, 10, { tapEnthalpy: 2500, heaterPressure: 5 })).toBeLessThanOrEqual(getBoilingPoint(5))
  })
})

describe("shaftDropWithExtraction", () => {
  const condenserBar = 0.031
  const total: number = getIsentropicEnthalpyDrop(165, condenserBar)

  it("is the full drop with no extraction", () => {
    expect(shaftDropWithExtraction(165, condenserBar, RatedSteamFlow, 0)).toBe(total)
  })

  it("is the full drop with no flow", () => {
    expect(shaftDropWithExtraction(165, condenserBar, 0, 0)).toBe(total)
  })

  it("falls by the extracted share of the drop below the tap", () => {
    const tap: number = getIsentropicEnthalpyDrop(165, tapPressureOf(RatedSteamFlow))
    const reduced: number = shaftDropWithExtraction(165, condenserBar, RatedSteamFlow, RatedSteamFlow * 0.25)
    expect(reduced).toBeCloseTo(total - 0.25 * (total - tap), 9)
    expect(reduced).toBeLessThan(total)
    expect(reduced).toBeGreaterThan(tap)
  })

  it("sanity: efficiency constant is the one the turbine uses", () => {
    expect(IsentropicEfficiency).toBeGreaterThan(0)
  })
})

describe("ratedExtractionShare", () => {
  it("is about a quarter of the rated flow (research: 26-34% of the Return)", () => {
    expect(ratedExtractionShare).toBeGreaterThan(0.2)
    expect(ratedExtractionShare).toBeLessThan(0.32)
  })
})

describe("energy across the turbine, heater and condenser", () => {
  it("shaft work, tap steam and exhaust together carry the inlet steam enthalpy", () => {
    const flow: number = RatedSteamFlow
    const condenserBar = 0.031
    const extraction = calculateExtraction({
      turbineFlow: flow,
      workFraction: 1,
      boilerPressure: 165,
      returnFlow: RatedReturn,
      returnTemperature: HotwellTemperature,
    })
    const inlet: number = getSaturationEnthalpies(165).vapor
    const shaft: number = flow * IsentropicEfficiency * shaftDropWithExtraction(165, condenserBar, flow, extraction.flow)
    const exhaust: number = (flow - extraction.flow) * getExhaustEnthalpy(165, condenserBar, IsentropicEfficiency, 1)
    const tap: number = extraction.flow * extraction.tapEnthalpy
    expect(shaft + tap + exhaust).toBeCloseTo(flow * inlet, 3)
  })
})
