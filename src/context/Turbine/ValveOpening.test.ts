import { describe, expect, test } from "vitest"
import { CstOil, CstSimulation } from "../const"
import { makeInitialState } from "../PowerPlantReducer"
import PowerPlantState from "../PowerPlantState"
import { isOpeningRefused } from "./ValveOpening"

// A plant that may open: oil at the permissive, the rotor on the gear, not tripped
const ready: PowerPlantState = (() => {
  const base: PowerPlantState = makeInitialState()
  return { ...base, Oil: { pumpRunning: true, headerPressure: CstOil.NominalPressure }, Turbine: { ...base.Turbine, turningGearEngaged: true } }
})()
const withTurbine = (patch: Partial<PowerPlantState["Turbine"]>): boolean =>
  isOpeningRefused({ ...ready.Turbine, ...patch }, ready.Oil)

describe("isOpeningRefused", () => {
  test("is allowed on the gear with oil, not tripped", () => {
    expect(isOpeningRefused(ready.Turbine, ready.Oil)).toBe(false)
  })

  test("is refused when tripped", () => {
    expect(withTurbine({ turbineTripped: true })).toBe(true)
  })

  test("is refused at the overspeed limit", () => {
    expect(withTurbine({ rpm: CstSimulation.CstTurbine.MaxRPM })).toBe(true)
  })

  test("is refused below the oil permissive", () => {
    expect(isOpeningRefused(ready.Turbine, { pumpRunning: false, headerPressure: 0 })).toBe(true)
  })

  test("is refused on a stopped rotor off the gear", () => {
    expect(withTurbine({ turningGearEngaged: false, rpm: 0 })).toBe(true)
  })
})
