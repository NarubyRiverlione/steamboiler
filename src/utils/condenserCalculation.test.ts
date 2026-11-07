import { describe, expect, test } from "vitest"
import { CstPhysics, CstSimulation } from "../context/const"
import {
  CalculateCondensationFlow,
  calculateCondensation,
  condenserHeatCapacity,
  calculateHotwellExchange,
  mixTemperature,
  saturationTemperature,
  splitStreamAtCondenser,
} from "./condenserCalculation"
import { getSaturationEnthalpies } from "./steamTable"

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

describe("calculateCondensation outlet temperature", () => {
  // saturation temperatures from the steam tables (°C) at the condenser pressure (mbar absolute)
  test.each([
    [50, 32.9],
    [80, 41.5],
    [100, 45.8],
    [200, 60.1],
  ])("condensate leaves at the saturation temperature at %i mbar", (pressure: number, saturation: number) => {
    const { newOutletTemperature } = calculateCondensation(100, 1000, 0.5, pressure, 1e6)
    expect(newOutletTemperature).toBeCloseTo(saturation, 0)
  })

  test("does not depend on the recirculation flow, also with no flow", () => {
    const flowing = calculateCondensation(100, 1000, 1, 80, 1e6).newOutletTemperature
    const half = calculateCondensation(100, 1000, 0.3, 80, 1e6).newOutletTemperature
    const stopped = calculateCondensation(100, 1000, 0, 80, 1e6).newOutletTemperature
    expect(half).toBe(flowing)
    expect(stopped).toBe(flowing)
  })
})

describe("condenserHeatCapacity (limited exchanger, ADR 0032)", () => {
  const { RecirculationPump_MaxFlowRate, RecirculationPump_IntakeTemperature, HeatExchangerUA } = CstCondenser
  const designSaturation: number = saturationTemperature(31)

  test("at the design flow the cooling water rise is about 8.5 K at the rated load", () => {
    // The rated load puts about 262 MW into the condenser: the exchanger at the design vacuum gives that
    const heat: number = condenserHeatCapacity(RecirculationPump_MaxFlowRate, designSaturation)
    const rise: number = heat / (RecirculationPump_MaxFlowRate * CstPhysics.Water_SpecificHeat)
    expect(heat / 1000).toBeGreaterThan(240)
    expect(heat / 1000).toBeLessThan(285)
    expect(rise).toBeGreaterThan(7.8)
    expect(rise).toBeLessThan(9.2)
  })

  test("the terminal temperature difference at the design point is about 6 K", () => {
    const heat: number = condenserHeatCapacity(RecirculationPump_MaxFlowRate, designSaturation)
    const outlet: number =
      RecirculationPump_IntakeTemperature + heat / (RecirculationPump_MaxFlowRate * CstPhysics.Water_SpecificHeat)
    expect(designSaturation - outlet).toBeGreaterThan(5.4)
    expect(designSaturation - outlet).toBeLessThan(6.6)
  })

  test("the cooling water never leaves at the saturation temperature with flow on", () => {
    for (const flow of [100, 1000, RecirculationPump_MaxFlowRate]) {
      const heat: number = condenserHeatCapacity(flow, 60)
      const outlet: number = RecirculationPump_IntakeTemperature + heat / (flow * CstPhysics.Water_SpecificHeat)
      expect(outlet).toBeLessThan(60)
    }
  })

  test("no flow takes no heat, with no division by zero", () => {
    expect(condenserHeatCapacity(0, designSaturation)).toBe(0)
  })

  test("at half the flow the surface falls by √2 and the vacuum worsens", () => {
    const half: number = RecirculationPump_MaxFlowRate / 2
    // UA at half flow, read back from the effectiveness
    const capacityRate: number = half * CstPhysics.Water_SpecificHeat
    const effectiveness: number =
      condenserHeatCapacity(half, designSaturation) / (capacityRate * (designSaturation - RecirculationPump_IntakeTemperature))
    const ua: number = -Math.log(1 - effectiveness) * capacityRate
    expect(ua).toBeCloseTo(HeatExchangerUA / Math.sqrt(2), 6)
    // less heat taken at the same saturation temperature: the steam backs up until it is hotter
    expect(condenserHeatCapacity(half, designSaturation)).toBeLessThan(
      condenserHeatCapacity(RecirculationPump_MaxFlowRate, designSaturation),
    )
  })

  test("takes nothing when the saturation temperature is at or below the intake", () => {
    expect(condenserHeatCapacity(RecirculationPump_MaxFlowRate, RecirculationPump_IntakeTemperature - 3)).toBe(0)
  })
})

describe("splitStreamAtCondenser", () => {
  const { liquid, vapor } = getSaturationEnthalpies(0.031)

  test("saturated vapour is all vapour with no extra heat", () => {
    expect(splitStreamAtCondenser(vapor, 31)).toEqual({ quality: 1, excessHeat: 0 })
  })

  test("below saturated vapour it splits into moisture and vapour", () => {
    const { quality, excessHeat } = splitStreamAtCondenser(liquid + 0.7 * (vapor - liquid), 31)
    expect(quality).toBeCloseTo(0.7, 9)
    expect(excessHeat).toBe(0)
  })

  test("above saturated vapour the extra heat is reported and the quality stays 1", () => {
    expect(splitStreamAtCondenser(vapor + 200, 31)).toEqual({ quality: 1, excessHeat: 200 })
  })

  test("bypass steam at 10 bar takes about 8% more cooling than the latent heat, at 165 bar under 1%", () => {
    const latent: number = vapor - liquid
    const at10: number = splitStreamAtCondenser(getSaturationEnthalpies(10).vapor, 31).excessHeat
    const at165: number = splitStreamAtCondenser(getSaturationEnthalpies(165).vapor, 31).excessHeat
    expect(at10 / latent).toBeGreaterThan(0.07)
    expect(at10 / latent).toBeLessThan(0.1)
    expect(at165 / latent).toBeLessThan(0.01)
  })
})

describe("calculateCondensation heat balance", () => {
  const { RecirculationPump_MaxFlowRate } = CstCondenser
  const condensedAt = (pressure: number, valve = 1, excess = 0): number =>
    100 - calculateCondensation(100, 1000, valve, pressure, 1e6, excess).steamMassAfterCondensation

  test("condenses more where the saturation temperature is higher (bigger difference to the cooling water)", () => {
    expect(condensedAt(200)).toBeGreaterThan(condensedAt(80))
  })

  test("condenses nothing when the saturation temperature is at or below the cooling water intake", () => {
    // 10 mbar saturates at about 7 °C, below the 10 °C intake
    expect(condensedAt(10)).toBe(0)
  })

  test("condenses nothing with the pump off", () => {
    expect(condensedAt(200, 0)).toBe(0)
  })

  test("condenses the exchanger heat over the latent heat, with no speed-up factor", () => {
    const heat: number = condenserHeatCapacity(RecirculationPump_MaxFlowRate, saturationTemperature(200)) * DeltaTime
    const { liquid, vapor } = getSaturationEnthalpies(0.2)
    expect(condensedAt(200)).toBeCloseTo(heat / (vapor - liquid), 9)
  })

  test("heat the intake carries above saturated vapour takes cooling water capacity: less vapour condenses", () => {
    expect(condensedAt(200, 1, 500)).toBeLessThan(condensedAt(200))
  })

  test("the extra heat is charged at cost: kJ of excess equal kJ of latent heat not used", () => {
    const { liquid, vapor } = getSaturationEnthalpies(0.2)
    expect((condensedAt(200) - condensedAt(200, 1, 500)) * (vapor - liquid)).toBeCloseTo(500, 6)
  })

  test("the full-gas pump sizing condenses the full-load exhaust at the design vacuum with the rated heat", () => {
    // ≈ 262 MW at 31 mbar over the latent heat of about 2430 kJ/kg: well above the 164 kg/s rated flow's exhaust
    const condensed: number = 1e6 - calculateCondensation(1e6, 1000, 1, 31, 1e6).steamMassAfterCondensation
    expect(condensed / DeltaTime).toBeGreaterThan(100)
  })

  test("the cooling water outlet temperature carries the heat taken and stays below saturation", () => {
    const result = calculateCondensation(1e6, 1000, 1, 31, 1e6)
    expect(result.coolingWaterOutletTemperature).toBeGreaterThan(CstCondenser.RecirculationPump_IntakeTemperature)
    expect(result.coolingWaterOutletTemperature).toBeLessThan(saturationTemperature(31))
  })

  test("with no flow the cooling water outlet is the intake temperature", () => {
    expect(calculateCondensation(100, 1000, 0, 200, 1e6, 100).coolingWaterOutletTemperature).toBe(
      CstCondenser.RecirculationPump_IntakeTemperature,
    )
  })

  test("with little steam to condense the cooling water takes only that heat", () => {
    const few = calculateCondensation(0.01, 1000, 1, 31, 1e6)
    const many = calculateCondensation(1e6, 1000, 1, 31, 1e6)
    expect(few.coolingWaterOutletTemperature).toBeLessThan(many.coolingWaterOutletTemperature)
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

describe("calculateCondensation outlet temperature", () => {
  // saturation temperatures from the steam tables (°C) at the condenser pressure (mbar absolute)
  test.each([
    [50, 32.9],
    [80, 41.5],
    [100, 45.8],
    [200, 60.1],
  ])("condensate leaves at the saturation temperature at %i mbar", (pressure: number, saturation: number) => {
    const { newOutletTemperature } = calculateCondensation(100, 1000, 0.5, pressure, 1e6)
    expect(newOutletTemperature).toBeCloseTo(saturation, 0)
  })

  test("does not depend on the recirculation flow, also with no flow", () => {
    const flowing = calculateCondensation(100, 1000, 1, 80, 1e6).newOutletTemperature
    const half = calculateCondensation(100, 1000, 0.3, 80, 1e6).newOutletTemperature
    const stopped = calculateCondensation(100, 1000, 0, 80, 1e6).newOutletTemperature
    expect(half).toBe(flowing)
    expect(stopped).toBe(flowing)
  })
})

