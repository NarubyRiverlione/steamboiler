import { describe, expect, test } from "vitest"
import { CstOil, CstSimulation } from "../const"
import { OilState, TurbineState } from "../PowerPlantState"
import { makeInitialState } from "../PowerPlantReducer"
import { isAtOilPermissive, isBelowOilTripLimit, isTurbineRunning, OilTick } from "./OilTick"

const oil = (pumpRunning: boolean, headerPressure: number): OilState => ({ pumpRunning, headerPressure })
const turbine = (patch: Partial<TurbineState>): TurbineState => ({ ...makeInitialState().Turbine, ...patch })

describe("OilTick", () => {
  test("a running pump raises the header pressure toward nominal, never past it", () => {
    let state: OilState = oil(true, 0)
    let last = 0
    for (let i = 0; i < 2000; i++) {
      state = OilTick(state)
      expect(state.headerPressure).toBeGreaterThanOrEqual(last)
      expect(state.headerPressure).toBeLessThanOrEqual(CstOil.NominalPressure)
      last = state.headerPressure
    }
    expect(state.headerPressure).toBeCloseTo(CstOil.NominalPressure, 3)
  })

  test("the build follows the time constant: 63% of nominal after one constant", () => {
    let state: OilState = oil(true, 0)
    for (let i = 0; i < CstOil.BuildTimeConstant / CstSimulation.DeltaTime; i++) state = OilTick(state)
    expect(state.headerPressure / CstOil.NominalPressure).toBeCloseTo(1 - Math.exp(-1), 3)
  })

  test("a stopped pump lets the pressure decay toward 0, slower than it builds", () => {
    let state: OilState = oil(false, CstOil.NominalPressure)
    for (let i = 0; i < CstOil.DecayTimeConstant / CstSimulation.DeltaTime; i++) state = OilTick(state)
    expect(state.headerPressure / CstOil.NominalPressure).toBeCloseTo(Math.exp(-1), 3)
    expect(CstOil.DecayTimeConstant).toBeGreaterThan(CstOil.BuildTimeConstant)
  })

  test("a stopped pump with no pressure stays at 0 and keeps the pump flag", () => {
    expect(OilTick(oil(false, 0))).toEqual(oil(false, 0))
  })

  test("the permissive and the trip limit are read from the pressure", () => {
    expect(isAtOilPermissive(oil(true, CstOil.PermissivePressure))).toBe(true)
    expect(isAtOilPermissive(oil(true, CstOil.PermissivePressure - 0.01))).toBe(false)
    expect(isBelowOilTripLimit(oil(true, CstOil.TripPressure))).toBe(false)
    expect(isBelowOilTripLimit(oil(true, CstOil.TripPressure - 0.01))).toBe(true)
  })

  test("the turbine runs above the running speed or with the valve open", () => {
    expect(isTurbineRunning(turbine({}))).toBe(false)
    expect(isTurbineRunning(turbine({ rpm: CstOil.RunningRPM }))).toBe(false)
    expect(isTurbineRunning(turbine({ rpm: CstOil.RunningRPM + 1 }))).toBe(true)
    expect(isTurbineRunning(turbine({ turbineValvePosition: 0.01 }))).toBe(true)
  })
})
