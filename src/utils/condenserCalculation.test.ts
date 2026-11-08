import { describe, expect, test } from "vitest"
import { CstPhysics, CstSimulation } from "../context/const"
import {
  airMassOf,
  airPressureOf,
  CalculateCondensationFlow,
  calculateAirInventory,
  calculateCondensation,
  condenserHeatCapacity,
  condensingDemand,
  calculateHotwellExchange,
  mixTemperature,
  saturationTemperature,
  solveShellVapourPressure,
  splitStreamAtCondenser,
  SteamStream,
  vapourPressureAt,
} from "./condenserCalculation"
import { CondenserState } from "../context/PowerPlantState"
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
  const steam = (flow = 10): SteamStream[] => [{ flow, enthalpy: getSaturationEnthalpies(0.08).vapor }]

  // saturation temperatures from the steam tables (°C) at the condenser pressure (mbar absolute)
  test.each([
    [50, 32.9],
    [80, 41.5],
    [100, 45.8],
    [200, 60.1],
  ])("condensate leaves at the saturation temperature at %i mbar", (pressure: number, saturation: number) => {
    const { newOutletTemperature } = calculateCondensation(steam(), 0.5, pressure, 1e6)
    expect(newOutletTemperature).toBeCloseTo(saturation, 0)
  })

  test("does not depend on the recirculation flow, also with no flow", () => {
    const flowing = calculateCondensation(steam(), 1, 80, 1e6).newOutletTemperature
    const half = calculateCondensation(steam(), 0.3, 80, 1e6).newOutletTemperature
    const stopped = calculateCondensation(steam(), 0, 80, 1e6).newOutletTemperature
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

describe("condensingDemand", () => {
  const { liquid, vapor } = getSaturationEnthalpies(0.05)

  test("saturated vapour costs its latent heat per kg", () => {
    expect(condensingDemand([{ flow: 10, enthalpy: vapor }], 50)).toBeCloseTo(10 * (vapor - liquid), 6)
  })

  test("moisture costs nothing: a stream at quality x costs x of the latent heat", () => {
    const wet: number = liquid + 0.67 * (vapor - liquid)
    expect(condensingDemand([{ flow: 10, enthalpy: wet }], 50)).toBeCloseTo(10 * 0.67 * (vapor - liquid), 6)
  })

  test("heat above saturated vapour is added, and the streams add up", () => {
    const hot: SteamStream = { flow: 2, enthalpy: vapor + 100 }
    const wet: SteamStream = { flow: 4, enthalpy: liquid + 0.5 * (vapor - liquid) }
    expect(condensingDemand([hot, wet], 50)).toBeCloseTo(2 * (vapor + 100 - liquid) + 4 * 0.5 * (vapor - liquid), 6)
  })

  test("falls as the pressure rises, since the condensate leaves hotter", () => {
    const stream: SteamStream[] = [{ flow: 10, enthalpy: 2800 }]
    expect(condensingDemand(stream, 200)).toBeLessThan(condensingDemand(stream, 50))
  })

  test("no flow, no demand", () => {
    expect(condensingDemand([], 50)).toBe(0)
  })
})

describe("vapourPressureAt", () => {
  test.each([
    [10, 12.3],
    [24.7, 31],
    [45.8, 100],
  ])("%d °C saturates at about %d mbar", (temperature: number, pressure: number) => {
    expect(vapourPressureAt(temperature)).toBeCloseTo(pressure, 0)
  })
})

describe("solveShellVapourPressure (ADR 0035)", () => {
  const { RecirculationPump_MaxFlowRate } = CstCondenser
  const ceiling = 1353
  const bypass = (flow: number): SteamStream[] => [{ flow, enthalpy: getSaturationEnthalpies(165).vapor }]
  const solve = (streams: SteamStream[], flow = RecirculationPump_MaxFlowRate, hotwell = 10): number =>
    solveShellVapourPressure(streams, flow, ceiling, hotwell)

  test("the exchanger takes exactly the heat the intake brings at the solved pressure", () => {
    const streams: SteamStream[] = bypass(40)
    const pressure: number = solve(streams)
    const taken: number = condenserHeatCapacity(RecirculationPump_MaxFlowRate, saturationTemperature(pressure))
    expect(taken).toBeCloseTo(condensingDemand(streams, pressure), 0)
  })

  test("more steam raises the pressure along the saturation curve", () => {
    expect(solve(bypass(80))).toBeGreaterThan(solve(bypass(40)))
    expect(solve(bypass(40))).toBeGreaterThan(solve(bypass(10)))
  })

  test("less cooling water raises the pressure", () => {
    expect(solve(bypass(40), RecirculationPump_MaxFlowRate / 2)).toBeGreaterThan(solve(bypass(40)))
  })

  test("nothing to condense: the vapour pressure of the hotter of the intake water and the hotwell", () => {
    expect(solve([])).toBeCloseTo(vapourPressureAt(10), 3)
    expect(solve([], RecirculationPump_MaxFlowRate, 30)).toBeCloseTo(vapourPressureAt(30), 3)
  })

  test("with no cooling water flow the pressure goes to the ceiling", () => {
    expect(solve(bypass(5), 0)).toBe(ceiling)
  })

  test("more steam than the exchanger takes at the ceiling sits at the ceiling", () => {
    expect(solve(bypass(5000))).toBe(ceiling)
  })
})

describe("air inventory (ADR 0035)", () => {
  const { DeltaTime, CstCondenser: Cst } = CstSimulation
  const stopped: Pick<
    CondenserState,
    "airMass" | "pressure" | "isAirExtractionPumpEnabled" | "isSjaeEnabled" | "sjaeValvePosition"
  > = { airMass: 1, pressure: 30, isAirExtractionPumpEnabled: false, isSjaeEnabled: false, sjaeValvePosition: 0 }
  const step = (patch: Partial<typeof stopped>, boiler = 100) =>
    calculateAirInventory({ ...stopped, ...patch } as CondenserState, boiler)

  test("air mass and pressure convert both ways through the ideal gas law", () => {
    const mass: number = airMassOf(1000, 20)
    expect(airPressureOf(mass, 20)).toBeCloseTo(1000, 9)
    // 1 bar at 20 °C in 450 m³ is about 542 kg
    expect(airMassOf(1013.25, 20)).toBeGreaterThan(535)
    expect(airMassOf(1013.25, 20)).toBeLessThan(545)
  })

  test("with the vacuum system stopped the in-leakage is all that changes the air", () => {
    expect(step({}).airMass).toBeCloseTo(1 + Cst.AirLeakRate * DeltaTime, 12)
  })

  test("no air leaks in once the shell is at atmospheric pressure", () => {
    expect(step({ pressure: CstPhysics.AtmosphericPressure_mBar }).airMass).toBe(1)
  })

  test("the pump removes S·m/V, which is volume and not pressure: a tenth of the air goes at a tenth of the time constant", () => {
    const next: number = step({ isAirExtractionPumpEnabled: true }).airMass
    const timeConstant: number = Cst.ShellVolume / Cst.CAR_Capacity
    expect(1 - next).toBeCloseTo((1 * DeltaTime) / timeConstant, 2)
  })

  test("the pump pulls 1 bar down to the design vacuum in about a minute", () => {
    let air: number = airMassOf(CstPhysics.AtmosphericPressure_mBar, 20)
    let seconds = 0
    while (airPressureOf(air, 25) > Cst.OptimalPressure && seconds < 600) {
      air = calculateAirInventory({ ...stopped, airMass: air, pressure: 500, isAirExtractionPumpEnabled: true } as CondenserState, 100).airMass
      seconds += DeltaTime
    }
    expect(seconds).toBeGreaterThan(40)
    expect(seconds).toBeLessThan(80)
  })

  test("a pump bigger than the shell stays stable and never goes negative", () => {
    const next: number = step({
      airMass: 1e-6,
      pressure: CstPhysics.AtmosphericPressure_mBar,
      isAirExtractionPumpEnabled: true,
    }).airMass
    expect(next).toBeGreaterThan(0)
    expect(next).toBeLessThan(1e-6)
  })

  test("the SJAE removes with its valve position and not at all with the valve shut", () => {
    const shut = step({ isSjaeEnabled: true, sjaeValvePosition: 0 })
    const half = step({ isSjaeEnabled: true, sjaeValvePosition: 0.5 })
    const full = step({ isSjaeEnabled: true, sjaeValvePosition: 1 })
    expect(shut.airMass).toBeCloseTo(step({}).airMass, 12)
    expect(half.airMass).toBeLessThan(shut.airMass)
    expect(full.airMass).toBeLessThan(half.airMass)
    expect(shut.newIsSjaeEnabled).toBe(true)
  })

  test("the SJAE holds the air at a few mbar against the in-leakage", () => {
    const air: number = (Cst.AirLeakRate * Cst.ShellVolume) / Cst.SJAE_Capacity
    expect(airPressureOf(air, 25)).toBeGreaterThan(1)
    expect(airPressureOf(air, 25)).toBeLessThan(4)
  })

  test("the SJAE switches itself off without motive steam", () => {
    const next = step({ isSjaeEnabled: true, sjaeValvePosition: 1 }, CstSimulation.CstTurbine.MainSteamValveMinimumPressure)
    expect(next.newIsSjaeEnabled).toBe(false)
    expect(next.airMass).toBeCloseTo(step({}).airMass, 12)
  })

  test("the SJAE breaks above its suction limit: it switches itself off and removes nothing", () => {
    const next = step({ isSjaeEnabled: true, sjaeValvePosition: 1, pressure: Cst.SJAE_SuctionLimit + 1 })
    expect(next.newIsSjaeEnabled).toBe(false)
    expect(next.airMass).toBeCloseTo(step({}).airMass, 12)
  })

  test("the pump keeps pulling above the SJAE limit (it hogs, the SJAE holds)", () => {
    const next = step({ isAirExtractionPumpEnabled: true, pressure: 500 })
    expect(next.airMass).toBeLessThan(1)
  })

  test("a disabled SJAE ignores its valve", () => {
    expect(step({ isSjaeEnabled: false, sjaeValvePosition: 1 }).airMass).toBeCloseTo(step({}).airMass, 12)
  })
})

describe("calculateCondensation heat balance", () => {
  const { RecirculationPump_MaxFlowRate } = CstCondenser
  const vaporAt = (mbar: number): number => getSaturationEnthalpies(mbar / 1000).vapor
  const vapour = (flow: number, mbar: number, extra = 0): SteamStream[] => [
    { flow, enthalpy: vaporAt(mbar) + extra },
  ]
  // Little steam so the exchanger takes all of it, a lot so it takes only what it can
  const few = 1
  const flood = 5000

  test("below the capacity everything condenses and nothing is vented", () => {
    const result = calculateCondensation(vapour(few, 200), 1, 200, 1e6)
    expect(result.condensed).toBeCloseTo(few * DeltaTime, 9)
    expect(result.vented).toBe(0)
  })

  test("above the capacity the exchanger heat over the latent heat condenses, with no speed-up factor", () => {
    const heat: number = condenserHeatCapacity(RecirculationPump_MaxFlowRate, saturationTemperature(200)) * DeltaTime
    const { liquid, vapor } = getSaturationEnthalpies(0.2)
    const result = calculateCondensation(vapour(flood, 200), 1, 200, 1e6)
    expect(result.condensed).toBeCloseTo(heat / (vapor - liquid), 9)
  })

  test("what the exchanger cannot take is vented, and the mass balances", () => {
    const result = calculateCondensation(vapour(flood, 200), 1, 200, 1e6)
    expect(result.vented).toBeGreaterThan(0)
    expect(result.condensed + result.vented).toBeCloseTo(flood * DeltaTime, 9)
  })

  test("condenses nothing at or below the cooling water intake temperature, and with the pump off", () => {
    // 10 mbar saturates at about 7 °C, below the 10 °C intake
    expect(calculateCondensation(vapour(flood, 10), 1, 10, 1e6).condensed).toBe(0)
    expect(calculateCondensation(vapour(flood, 200), 0, 200, 1e6).condensed).toBe(0)
  })

  test("heat above saturated vapour takes cooling water capacity: less vapour condenses", () => {
    const plain = calculateCondensation(vapour(flood, 200), 1, 200, 1e6).condensed
    const hot = calculateCondensation(vapour(flood, 200, 500), 1, 200, 1e6).condensed
    expect(hot).toBeLessThan(plain)
  })

  test("moisture goes to the hotwell whatever the cooling water does", () => {
    const { liquid, vapor } = getSaturationEnthalpies(0.2)
    const wet: SteamStream[] = [{ flow: 10, enthalpy: liquid + 0.5 * (vapor - liquid) }]
    expect(calculateCondensation(wet, 0, 200, 1e6).condensed).toBeCloseTo(0.5 * 10 * DeltaTime, 9)
  })

  test("what does not fit in the hotwell is vented, so no mass is lost", () => {
    const result = calculateCondensation(vapour(few, 200), 1, 200, 0.05)
    expect(result.condensed).toBeCloseTo(0.05, 12)
    expect(result.vented).toBeCloseTo(few * DeltaTime - 0.05, 9)
  })

  test("the full-gas pump sizing condenses the full-load exhaust at the design vacuum with the rated heat", () => {
    // ≈ 262 MW at 31 mbar over the latent heat of about 2430 kJ/kg: well above the 164 kg/s rated flow's exhaust
    const condensed: number = calculateCondensation(vapour(flood, 31), 1, 31, 1e6).condensed
    expect(condensed / DeltaTime).toBeGreaterThan(100)
  })

  test("the cooling water outlet temperature carries the heat taken and stays below saturation", () => {
    const result = calculateCondensation(vapour(flood, 31), 1, 31, 1e6)
    expect(result.coolingWaterOutletTemperature).toBeGreaterThan(CstCondenser.RecirculationPump_IntakeTemperature)
    expect(result.coolingWaterOutletTemperature).toBeLessThan(saturationTemperature(31))
  })

  test("with no flow the cooling water outlet is the intake temperature", () => {
    expect(calculateCondensation(vapour(few, 200, 100), 0, 200, 1e6).coolingWaterOutletTemperature).toBe(
      CstCondenser.RecirculationPump_IntakeTemperature,
    )
  })

  test("with little steam to condense the cooling water takes only that heat", () => {
    const small = calculateCondensation(vapour(0.01, 31), 1, 31, 1e6)
    const large = calculateCondensation(vapour(flood, 31), 1, 31, 1e6)
    expect(small.coolingWaterOutletTemperature).toBeLessThan(large.coolingWaterOutletTemperature)
  })
})

