import { describe, expect, it } from "vitest"
import { CstDeaerator, CstPhysics, CstSimulation } from "../const"
import { DeaeratorInput, DeaeratorTick, makeColdDeaerator, makeHotDeaerator } from "./DeaeratorTick"
import { DeaeratorState } from "../PowerPlantState"
import { airMassInGasSpace, saturationPressureOf } from "../../utils/deaeratorCalculations"
import { getBoilingPoint, getLiquidEnthalpy, getSaturationEnthalpies } from "../../utils/steamTable"

const { DeltaTime } = CstSimulation
const SetTemperature: number = getBoilingPoint(CstDeaerator.Pressure)
const TapEnthalpy: number = getSaturationEnthalpies(5).vapor

const HotVolume: number = CstDeaerator.TotalVolume / 2 // litres, the 50% working level
const hotDeaerator = (): DeaeratorState => makeHotDeaerator(HotVolume)
const input = (overrides: Partial<DeaeratorInput> = {}): DeaeratorInput => ({
  intake: { mass: 0, temperature: 30 },
  drain: { mass: 0, enthalpy: getLiquidEnthalpy(150) },
  tapSteam: { mass: 0, enthalpy: TapEnthalpy },
  boiler: { pressure: 165, steamMass: 5000, lowLevel: false },
  ...overrides,
})
const energyOf = (mass: number, temperature: number): number => mass * getLiquidEnthalpy(temperature)

describe("makeColdDeaerator", () => {
  it("is filled to the cold fill level at ambient", () => {
    const state: DeaeratorState = makeColdDeaerator()
    expect(state.waterVolume).toBeCloseTo(CstDeaerator.TotalVolume * CstDeaerator.StartLevel, 6)
    expect(state.temperature).toBe(CstPhysics.AmbientTemperature)
  })
})

describe("DeaeratorTick", () => {
  it("holds the setpoint with extraction steam when the tap gave what the pressure loop asked, taking nothing from the boiler", () => {
    const intake = { mass: 20 * DeltaTime, temperature: 30 }
    const asked: number = DeaeratorTick(hotDeaerator(), input({ intake })).state.tapDemand
    const { state, letDownMass, outflow } = DeaeratorTick(
      hotDeaerator(),
      input({ intake, tapSteam: { mass: asked * DeltaTime, enthalpy: TapEnthalpy } }),
    )
    expect(state.temperature).toBeCloseTo(SetTemperature, 3) // the operating vent cools it by about 1e-4 K a tick
    expect(state.pressure).toBeCloseTo(CstDeaerator.Pressure, 1)
    expect(letDownMass).toBeCloseTo(0, 9)
    expect(state.extractionFlow).toBeCloseTo(asked, 9)
    expect(state.letDownValvePosition).toBeCloseTo(0, 9)
    expect(outflow.mass).toBeCloseTo(intake.mass + state.extractionFlow * DeltaTime, 9)
  })

  it("splits the range: the let-down valve makes up what the tap did not give", () => {
    const intake = { mass: 20 * DeltaTime, temperature: 30 }
    const { state, letDownMass } = DeaeratorTick(hotDeaerator(), input({ intake, tapSteam: { mass: 1 * DeltaTime, enthalpy: TapEnthalpy } }))
    expect(state.extractionFlow).toBeCloseTo(1, 9)
    expect(letDownMass).toBeGreaterThan(0)
    expect(state.temperature).toBeCloseTo(SetTemperature, 3) // the operating vent cools it by about 1e-4 K a tick
  })

  it("holds the setpoint on the auxiliary line alone with the turbine closed", () => {
    const intake = { mass: 20 * DeltaTime, temperature: 30 }
    const { state } = DeaeratorTick(hotDeaerator(), input({ intake }))
    expect(state.extractionFlow).toBe(0)
    expect(state.letDownFlow).toBeGreaterThan(0)
    expect(state.temperature).toBeCloseTo(SetTemperature, 3) // the operating vent cools it by about 1e-4 K a tick
  })

  it("passes no let-down steam while the boiler pressure is below the deaerator pressure", () => {
    const intake = { mass: 20 * DeltaTime, temperature: 30 }
    const { state, letDownMass } = DeaeratorTick(hotDeaerator(), input({ intake, boiler: { pressure: 2, steamMass: 5000, lowLevel: false } }))
    expect(letDownMass).toBe(0)
    expect(state.temperature).toBeLessThan(SetTemperature)
  })

  it("shuts the let-down valve while the burner low-low trip holds", () => {
    const intake = { mass: 20 * DeltaTime, temperature: 30 }
    const { letDownMass } = DeaeratorTick(hotDeaerator(), input({ intake, boiler: { pressure: 165, steamMass: 5000, lowLevel: true } }))
    expect(letDownMass).toBe(0)
  })

  it("never takes more steam than the boiler holds", () => {
    const { letDownMass } = DeaeratorTick(hotDeaerator(), input({ intake: { mass: 20, temperature: 30 }, boiler: { pressure: 165, steamMass: 0.5, lowLevel: false } }))
    expect(letDownMass).toBeCloseTo(0.5, 9)
  })

  it("keeps the condensed steam that heats the stored water, so the level rises on a cold start", () => {
    const cold: DeaeratorState = makeColdDeaerator()
    const { state, outflow } = DeaeratorTick(cold, input({ intake: { mass: 0, temperature: 20 }, boiler: { pressure: 100, steamMass: 5000, lowLevel: false } }))
    expect(state.waterMass).toBeGreaterThan(cold.waterMass)
    expect(outflow.mass).toBeCloseTo(0, 9)
  })

  it("conserves water and energy", () => {
    const before: DeaeratorState = hotDeaerator()
    const request: DeaeratorInput = input({
      intake: { mass: 20 * DeltaTime, temperature: 30 },
      drain: { mass: 5 * DeltaTime, enthalpy: getLiquidEnthalpy(150) },
      tapSteam: { mass: 3 * DeltaTime, enthalpy: TapEnthalpy },
    })
    const { state, letDownMass, outflow } = DeaeratorTick(before, request)
    const steam: number = state.extractionFlow * DeltaTime + letDownMass
    expect(state.waterMass + outflow.mass + (state.ventedTotal - before.ventedTotal)).toBeCloseTo(
      before.waterMass + request.intake.mass + request.drain.mass + steam,
      6,
    )
    const energyIn: number =
      energyOf(before.waterMass, before.temperature) +
      energyOf(request.intake.mass, 30) +
      request.drain.mass * request.drain.enthalpy +
      state.extractionFlow * DeltaTime * TapEnthalpy +
      letDownMass * getSaturationEnthalpies(165).vapor
    // the operating vent takes its steam at the saturated vapour enthalpy of the vessel
    const vented: number = state.ventedTotal - before.ventedTotal
    const energyOut: number = energyOf(state.waterMass + outflow.mass, state.temperature) + vented * getSaturationEnthalpies(CstDeaerator.Pressure).vapor
    expect(energyOut).toBeCloseTo(energyIn, -1)
  })

  it("does not cool: a drain hotter than the setpoint with nothing else raises the temperature and takes no steam", () => {
    const { state, letDownMass } = DeaeratorTick(hotDeaerator(), input({ drain: { mass: 5 * DeltaTime, enthalpy: getLiquidEnthalpy(150) } }))
    expect(letDownMass).toBe(0)
    expect(state.extractionFlow).toBe(0)
    expect(state.temperature).toBeGreaterThanOrEqual(SetTemperature)
  })
})

// A hot, nearly full vessel of the given water temperature with some air in it, as it is mid start-up
const heating = (temperature: number, airPressure: number, overrides: Partial<DeaeratorState> = {}): DeaeratorState => {
  const base: DeaeratorState = makeHotDeaerator(HotVolume)
  const volume: number = base.waterVolume
  const air: number = airMassInGasSpace(airPressure, temperature, volume)
  const saturation: number = saturationPressureOf(temperature)
  return { ...base, temperature, saturationPressure: saturation, airMass: air, airPressure, pressure: saturation + airPressure, safeToClose: false, ...overrides }
}
const idle = (): DeaeratorInput => input({ boiler: { pressure: 1, steamMass: 5000, lowLevel: false } })

describe("makeColdDeaerator air (ADR 0038)", () => {
  it("is full of air at atmospheric pressure with the start-up vent shut", () => {
    const state: DeaeratorState = makeColdDeaerator()
    expect(state.pressure).toBeCloseTo(CstPhysics.AtmosphericPressure_mBar / 1e3, 9)
    expect(state.pressure).toBeCloseTo(state.airPressure + state.saturationPressure, 9)
    expect(state.airMass).toBeGreaterThan(100)
    expect(state.startUpVentOpen).toBe(false)
    expect(state.safeToClose).toBe(false)
    expect(state.warnVentClosedWithAir).toBe(true)
    expect(state.warnVentOpenNoAir).toBe(false)
  })
})

describe("DeaeratorTick air, vents and relief", () => {
  it("makes the pressure the air pressure plus the saturation pressure", () => {
    const { state } = DeaeratorTick(heating(100, 0.5), idle())
    expect(state.pressure).toBeCloseTo(state.airPressure + state.saturationPressure, 9)
    expect(state.saturationPressure).toBeCloseTo(saturationPressureOf(state.temperature), 9)
  })

  it("keeps the air with the start-up vent shut (the operating vent takes a trace at most)", () => {
    const before: DeaeratorState = heating(100, 0.5)
    const { state } = DeaeratorTick(before, idle())
    expect(state.airMass).toBeLessThanOrEqual(before.airMass)
    expect(state.airMass).toBeGreaterThan(before.airMass * 0.999)
    expect(state.warnVentClosedWithAir).toBe(true)
  })

  it("takes the air out with the start-up vent open, and steam with it", () => {
    const before: DeaeratorState = heating(100, 0.5, { startUpVentOpen: true })
    const { state } = DeaeratorTick(before, idle())
    expect(state.airMass).toBeLessThan(before.airMass * 0.99)
    expect(state.ventedTotal).toBeGreaterThan(0)
  })

  it("passes steam only with the vent open and no air: it leaves the water, the water is cooler and the flag is set", () => {
    const before: DeaeratorState = heating(105, 0, { startUpVentOpen: true })
    const { state } = DeaeratorTick(before, idle())
    expect(state.airMass).toBe(0)
    expect(state.ventedTotal).toBeGreaterThan(0.01)
    expect(state.waterMass).toBeLessThan(before.waterMass)
    expect(state.temperature).toBeLessThan(105)
    expect(state.warnVentOpenNoAir).toBe(true)
    expect(state.warnVentClosedWithAir).toBe(false)
  })

  it("passes no steam through a shut vent at no air", () => {
    const before: DeaeratorState = heating(105, 0)
    const { state } = DeaeratorTick(before, idle())
    expect(state.warnVentOpenNoAir).toBe(false)
    expect(state.ventedTotal - before.ventedTotal).toBeLessThan(0.005)
  })

  it("lights the safe-to-close lamp under the threshold and holds it to the release pressure", () => {
    const { SafeToClosePressure: lit, SafeToCloseRelease: release } = CstDeaerator
    expect(DeaeratorTick(heating(100, lit * 0.9), idle()).state.safeToClose).toBe(true)
    expect(DeaeratorTick(heating(100, (lit + release) / 2), idle()).state.safeToClose).toBe(false)
    expect(DeaeratorTick(heating(100, (lit + release) / 2, { safeToClose: true }), idle()).state.safeToClose).toBe(true)
    expect(DeaeratorTick(heating(100, release * 1.2, { safeToClose: true }), idle()).state.safeToClose).toBe(false)
  })

  it("lifts the relief valve at 4 bar, loses steam and air, holds to the reseat pressure and shuts under it", () => {
    const lifting: DeaeratorState = heating(133, 1.2) // about 4.2 bar
    expect(lifting.pressure).toBeGreaterThan(CstDeaerator.ReliefPressure)
    const lifted = DeaeratorTick(lifting, idle()).state
    expect(lifted.reliefValveOpen).toBe(true)
    expect(lifted.ventedTotal).toBeGreaterThan(1)
    expect(lifted.airMass).toBeLessThan(lifting.airMass)
    // between the reseat and lift pressures: open stays open, shut stays shut
    const between: DeaeratorState = heating(133, 0.7)
    expect(between.pressure).toBeGreaterThan(CstDeaerator.ReliefReseatPressure)
    expect(between.pressure).toBeLessThan(CstDeaerator.ReliefPressure)
    expect(DeaeratorTick({ ...between, reliefValveOpen: true }, idle()).state.reliefValveOpen).toBe(true)
    expect(DeaeratorTick(between, idle()).state.reliefValveOpen).toBe(false)
    const low: DeaeratorState = heating(133, 0.4)
    expect(DeaeratorTick({ ...low, reliefValveOpen: true }, idle()).state.reliefValveOpen).toBe(false)
  })

  it("does no damage: the pressure the valve limits stays finite and the water stays positive", () => {
    const { state } = DeaeratorTick(heating(150, 3, { reliefValveOpen: true }), idle())
    expect(Number.isFinite(state.pressure)).toBe(true)
    expect(state.waterMass).toBeGreaterThan(0)
  })

  it("keeps the water and the vented total balanced to the mass the vents let out", () => {
    const before: DeaeratorState = heating(105, 0, { startUpVentOpen: true })
    const { state, outflow } = DeaeratorTick(before, idle())
    expect(state.waterMass + outflow.mass + (state.ventedTotal - before.ventedTotal)).toBeCloseTo(before.waterMass, 9)
  })
})
