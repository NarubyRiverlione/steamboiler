import { describe, expect, test } from "vitest"
import { CstSimulation } from "../context/const"
import { CalculateCondensationFlow, calculateHotwellExchange, mixTemperature } from "./condenserCalculation"

const { DeltaTime, CstCondenser } = CstSimulation

describe("mixTemperature", () => {
  test("weights each temperature by its volume", () => {
    expect(mixTemperature(300, 40, 100, 20)).toBe(35)
  })

  test("keeps the first temperature when there is no water", () => {
    expect(mixTemperature(0, 40, 0, 20)).toBe(40)
  })
})

describe("calculateHotwellExchange", () => {
  test("closed valves change nothing", () => {
    expect(calculateHotwellExchange(1000, 40, 0, 0)).toEqual({
      volume: 1000,
      temperature: 40,
      makeup: 0,
      reject: 0,
    })
  })

  test("makeup adds water at makeup temperature", () => {
    const makeup = CstCondenser.Makeup_MaxFlowRate * DeltaTime
    const result = calculateHotwellExchange(1000, 40, 1, 0)
    expect(result.makeup).toBe(makeup)
    expect(result.volume).toBe(1000 + makeup)
    expect(result.temperature).toBeCloseTo(mixTemperature(1000, 40, makeup, CstCondenser.Makeup_Temperature))
  })

  test("reject removes water at the valve rate", () => {
    const result = calculateHotwellExchange(1000, 40, 0, 0.5)
    expect(result.reject).toBe(0.5 * CstCondenser.Reject_MaxFlowRate * DeltaTime)
    expect(result.volume).toBe(1000 - result.reject)
    expect(result.temperature).toBe(40)
  })

  test("reject never takes more than the hotwell holds", () => {
    const result = calculateHotwellExchange(1, 40, 0, 1)
    expect(result.reject).toBe(1)
    expect(result.volume).toBe(0)
  })
})

describe("CalculateCondensationFlow", () => {
  // 300 l/s full open for one 0.1 s tick
  const fullPump = 30

  test("returns the pump volume when the hotwell and the boiler have room", () => {
    expect(CalculateCondensationFlow(1, 1000, 1000)).toEqual({ condensatePumpVolume: fullPump, newHotwellWaterVolume: 970 })
  })

  test("never returns more than the hotwell holds", () => {
    expect(CalculateCondensationFlow(1, 12, 1000)).toEqual({ condensatePumpVolume: 12, newHotwellWaterVolume: 0 })
    expect(CalculateCondensationFlow(1, 0, 1000)).toEqual({ condensatePumpVolume: 0, newHotwellWaterVolume: 0 })
  })

  test("never returns more than the boiler has room for, the rest stays in the hotwell", () => {
    expect(CalculateCondensationFlow(1, 1000, 5)).toEqual({ condensatePumpVolume: 5, newHotwellWaterVolume: 995 })
    expect(CalculateCondensationFlow(1, 1000, 0)).toEqual({ condensatePumpVolume: 0, newHotwellWaterVolume: 1000 })
  })

  test("a closed valve returns nothing", () => {
    expect(CalculateCondensationFlow(0, 1000, 1000)).toEqual({ condensatePumpVolume: 0, newHotwellWaterVolume: 1000 })
  })
})
