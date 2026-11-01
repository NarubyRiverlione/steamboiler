import { describe, expect, test } from "vitest"
import { CstSimulation } from "../context/const"
import { CalculateCondensationFlow, calculateHotwellExchange, mixTemperature } from "./condenserCalculation"

const { DeltaTime, CstCondenser } = CstSimulation

describe("mixTemperature", () => {
  test("weights each temperature by its mass", () => {
    expect(mixTemperature(300, 40, 100, 20)).toBe(35)
  })

  test("keeps the first temperature when there is no water", () => {
    expect(mixTemperature(0, 40, 0, 20)).toBe(40)
  })
})

// Litres to kg at 40 °C, where 1 kg of water takes 1.0079 L (IAPWS-IF97)
const kgAt40 = (litres: number): number => litres / 1.0079

describe("calculateHotwellExchange", () => {
  const plenty = 1e6

  test("closed valves change nothing", () => {
    expect(calculateHotwellExchange(1000, 40, 0, 0, plenty)).toEqual({
      mass: 1000,
      temperature: 40,
      makeup: 0,
      reject: 0,
    })
  })

  test("makeup adds the valve litres as kg at the hotwell temperature, mixed in at makeup temperature", () => {
    const makeup = kgAt40(CstCondenser.Makeup_MaxFlowRate * DeltaTime)
    const result = calculateHotwellExchange(1000, 40, 1, 0, plenty)
    expect(result.makeup).toBeCloseTo(makeup, 6)
    expect(result.mass).toBeCloseTo(1000 + makeup, 6)
    expect(result.temperature).toBeCloseTo(mixTemperature(1000, 40, makeup, CstCondenser.Makeup_Temperature))
  })

  test("makeup stops at the room left in the hotwell", () => {
    const result = calculateHotwellExchange(1000, 40, 1, 0, 2)
    expect(result.makeup).toBe(2)
    expect(result.mass).toBe(1002)
  })

  test("reject removes the valve litres as kg at the valve rate", () => {
    const result = calculateHotwellExchange(1000, 40, 0, 0.5, plenty)
    expect(result.reject).toBeCloseTo(kgAt40(0.5 * CstCondenser.Reject_MaxFlowRate * DeltaTime), 6)
    expect(result.mass).toBeCloseTo(1000 - result.reject, 9)
    expect(result.temperature).toBe(40)
  })

  test("reject never takes more than the hotwell holds", () => {
    const result = calculateHotwellExchange(1, 40, 0, 1, plenty)
    expect(result.reject).toBe(1)
    expect(result.mass).toBe(0)
  })
})

describe("CalculateCondensationFlow", () => {
  // 300 l/s full open for one 0.1 s tick, as kg at 40 °C
  const fullPump: number = kgAt40(30)

  test("returns the pump flow in kg when the hotwell and the boiler have room", () => {
    const result = CalculateCondensationFlow(1, 1000, 40, 1000)
    expect(result.condensatePumpMass).toBeCloseTo(fullPump, 6)
    expect(result.newHotwellWaterMass).toBeCloseTo(1000 - fullPump, 6)
  })

  test("never returns more than the hotwell holds", () => {
    expect(CalculateCondensationFlow(1, 12, 40, 1000)).toEqual({ condensatePumpMass: 12, newHotwellWaterMass: 0 })
    expect(CalculateCondensationFlow(1, 0, 40, 1000)).toEqual({ condensatePumpMass: 0, newHotwellWaterMass: 0 })
  })

  test("never returns more than the boiler has room for, the rest stays in the hotwell", () => {
    expect(CalculateCondensationFlow(1, 1000, 40, 5)).toEqual({ condensatePumpMass: 5, newHotwellWaterMass: 995 })
    expect(CalculateCondensationFlow(1, 1000, 40, 0)).toEqual({ condensatePumpMass: 0, newHotwellWaterMass: 1000 })
  })

  test("a closed valve returns nothing", () => {
    expect(CalculateCondensationFlow(0, 1000, 40, 1000)).toEqual({ condensatePumpMass: 0, newHotwellWaterMass: 1000 })
  })
})
