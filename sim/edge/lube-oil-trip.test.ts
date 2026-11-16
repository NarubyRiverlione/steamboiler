import { describe, expect, test } from "vitest"
import { CstOil } from "../../src/context/const"
import { runChecked } from "../scenario-checks"
import { lubeOilTrip, OilStartAt, PumpRestartAt, PumpStopAt, RefusedResetAt, ResetAt, RollAt } from "../scenarios/lube-oil-trip"

describe("lube-oil-trip", () => {
  const { samples } = runChecked(lubeOilTrip)
  const at = (time: number) => (samples.find((s) => s.time >= time) ?? samples[samples.length - 1]).state
  const tripTime: number = samples.find((s) => s.state.Turbine.turbineTripped)?.time ?? -1

  test("the header builds toward nominal while the pump runs", () => {
    expect(at(OilStartAt).Oil.headerPressure).toBe(0)
    expect(at(OilStartAt + 5).Oil.headerPressure).toBeGreaterThan(0)
    expect(at(RollAt).Oil.headerPressure).toBeCloseTo(CstOil.NominalPressure, 2)
  })

  test("the turbine rolls on the built pressure and does not trip before the pump stops", () => {
    expect(at(PumpStopAt - 1).Turbine.turbineValvePosition).toBeGreaterThan(0)
    expect(at(PumpStopAt - 1).Turbine.turbineTripped).toBe(false)
  })

  test("the running turbine trips once the header decays below the trip limit, not before", () => {
    expect(tripTime).toBeGreaterThan(PumpStopAt)
    expect(at(tripTime).Oil.headerPressure).toBeLessThan(CstOil.TripPressure)
    expect(at(tripTime - 1).Oil.headerPressure).toBeGreaterThanOrEqual(CstOil.TripPressure)
    expect(at(tripTime).Turbine.turbineValvePosition).toBe(0)
  })

  test("a reset with no oil is refused: the flag stays set", () => {
    expect(at(RefusedResetAt + 1).Turbine.turbineTripped).toBe(true)
  })

  test("after the pump restart and the pressure recovery the reset clears the trip", () => {
    expect(at(PumpRestartAt + 5).Oil.headerPressure).toBeGreaterThan(CstOil.TripPressure)
    expect(at(ResetAt - 1).Turbine.turbineTripped).toBe(true)
    expect(at(ResetAt + 1).Turbine.turbineTripped).toBe(false)
    expect(at(ResetAt + 1).Turbine.turbineValvePosition).toBe(0)
  })
})
