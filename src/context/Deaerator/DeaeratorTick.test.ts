import { describe, expect, it } from "vitest"
import { CstDeaerator, CstPhysics, CstSimulation } from "../const"
import { DeaeratorInput, DeaeratorTick, makeColdDeaerator } from "./DeaeratorTick"
import { DeaeratorState } from "../PowerPlantState"
import { getBoilingPoint, getLiquidEnthalpy, getSaturationEnthalpies } from "../../utils/steamTable"
import { waterMassOf } from "../../utils/boilerCalculations"

const { DeltaTime } = CstSimulation
const SetTemperature: number = getBoilingPoint(CstDeaerator.Pressure)
const TapEnthalpy: number = getSaturationEnthalpies(5).vapor

const HotVolume: number = CstDeaerator.TotalVolume / 2 // litres, the 50% working level
const hotDeaerator = (): DeaeratorState => {
  const mass: number = waterMassOf(HotVolume, SetTemperature)
  return { ...makeColdDeaerator(), waterMass: mass, waterVolume: HotVolume, temperature: SetTemperature, pressure: CstDeaerator.Pressure }
}
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
    expect(state.temperature).toBeCloseTo(SetTemperature, 6)
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
    expect(state.temperature).toBeCloseTo(SetTemperature, 6)
  })

  it("holds the setpoint on the auxiliary line alone with the turbine closed", () => {
    const intake = { mass: 20 * DeltaTime, temperature: 30 }
    const { state } = DeaeratorTick(hotDeaerator(), input({ intake }))
    expect(state.extractionFlow).toBe(0)
    expect(state.letDownFlow).toBeGreaterThan(0)
    expect(state.temperature).toBeCloseTo(SetTemperature, 6)
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
    expect(state.waterMass + outflow.mass).toBeCloseTo(before.waterMass + request.intake.mass + request.drain.mass + steam, 6)
    const energyIn: number =
      energyOf(before.waterMass, before.temperature) +
      energyOf(request.intake.mass, 30) +
      request.drain.mass * request.drain.enthalpy +
      state.extractionFlow * DeltaTime * TapEnthalpy +
      letDownMass * getSaturationEnthalpies(165).vapor
    const energyOut: number = energyOf(state.waterMass + outflow.mass, state.temperature)
    expect(energyOut).toBeCloseTo(energyIn, 3)
  })

  it("does not cool: a drain hotter than the setpoint with nothing else raises the temperature and takes no steam", () => {
    const { state, letDownMass } = DeaeratorTick(hotDeaerator(), input({ drain: { mass: 5 * DeltaTime, enthalpy: getLiquidEnthalpy(150) } }))
    expect(letDownMass).toBe(0)
    expect(state.extractionFlow).toBe(0)
    expect(state.temperature).toBeGreaterThanOrEqual(SetTemperature)
  })
})
