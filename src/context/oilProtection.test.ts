import { describe, expect, test } from "vitest"
import { CstOil } from "./const"
import { makeInitialState, powerPlantReducer } from "./PowerPlantReducer"
import PowerPlantState from "./PowerPlantState"
import PowerPlantTick from "./PowerPlantTick"
import { isTripped, tripResetRefusal } from "./tripReset"

const withOil = (headerPressure: number, pumpRunning = true, turbine: Partial<PowerPlantState["Turbine"]> = {}): PowerPlantState => {
  const base: PowerPlantState = makeInitialState()
  return { ...base, Condenser: { ...base.Condenser, pressure: 50 }, Oil: { pumpRunning, headerPressure }, Turbine: { ...base.Turbine, ...turbine } }
}
const openValve = (state: PowerPlantState, step: number): PowerPlantState =>
  powerPlantReducer(state, { type: "ADJUST_STEAM_TURBINE_VALVE", payload: { turbineValvePosition: step } })

describe("lube oil protection (ADR 0050)", () => {
  test("SET_OIL_PUMP starts and stops the pump and leaves the pressure alone", () => {
    const started: PowerPlantState = powerPlantReducer(withOil(0, false), { type: "SET_OIL_PUMP", payload: { pumpRunning: true } })
    expect(started.Oil).toEqual({ pumpRunning: true, headerPressure: 0 })
    expect(powerPlantReducer(started, { type: "SET_OIL_PUMP", payload: { pumpRunning: false } }).Oil.pumpRunning).toBe(false)
  })

  describe("permissive", () => {
    test("the valve cannot be opened below the permissive pressure, and can at it", () => {
      const low: PowerPlantState = withOil(CstOil.PermissivePressure - 0.01)
      expect(openValve(low, 0.1)).toBe(low)
      expect(openValve(withOil(CstOil.PermissivePressure), 0.1).Turbine.turbineValvePosition).toBeCloseTo(0.1)
    })

    test("closing is always allowed, with no oil", () => {
      expect(openValve(withOil(0, false, { turbineValvePosition: 0.3 }), -0.1).Turbine.turbineValvePosition).toBeCloseTo(0.2)
    })

    test("the Ramp up PID does not open the valve below the permissive", () => {
      const rolling: Partial<PowerPlantState["Turbine"]> = { mainSteamValve: true, speedMode: "rampUp", runUpPoint: 500, speedReference: 0 }
      const boiler = { pressure: 165 }
      const noOil: PowerPlantState = withOil(CstOil.PermissivePressure - 0.1, true, rolling)
      const state = (s: PowerPlantState): PowerPlantState => ({ ...s, Boiler: { ...s.Boiler, ...boiler } })
      expect(PowerPlantTick(state(noOil)).Turbine.turbineValvePosition).toBe(0)
      const withPressure: PowerPlantState = withOil(CstOil.NominalPressure, true, rolling)
      expect(PowerPlantTick(state(withPressure)).Turbine.turbineValvePosition).toBeGreaterThan(0)
    })
  })

  describe("trip", () => {
    test("a running turbine (valve open) trips below the trip limit", () => {
      const next: PowerPlantState = PowerPlantTick(withOil(CstOil.TripPressure - 0.1, false, { turbineValvePosition: 0.2 }))
      expect(next.Turbine.turbineTripped).toBe(true)
      expect(next.Turbine.turbineValvePosition).toBe(0)
    })

    test("a turbine coasting above the running speed with the valve shut trips too", () => {
      const next: PowerPlantState = PowerPlantTick(withOil(0, false, { rpm: CstOil.RunningRPM + 50 }))
      expect(next.Turbine.turbineTripped).toBe(true)
    })

    test("a stopped turbine with no oil does not trip", () => {
      expect(PowerPlantTick(withOil(0, false)).Turbine.turbineTripped).toBe(false)
    })

    test("a running turbine above the trip limit does not trip", () => {
      expect(PowerPlantTick(withOil(CstOil.NominalPressure, true, { turbineValvePosition: 0.2 })).Turbine.turbineTripped).toBe(false)
    })
  })

  describe("trip reset", () => {
    const tripped = (headerPressure: number): PowerPlantState => withOil(headerPressure, true, { turbineTripped: true, rpm: 100 })

    test("refused below the trip limit, allowed at it", () => {
      const low: PowerPlantState = tripped(CstOil.TripPressure - 0.01)
      expect(tripResetRefusal(low, "turbine")).toContain("Lube oil")
      expect(powerPlantReducer(low, { type: "RESET_TRIP", payload: { trip: "turbine" } })).toBe(low)
      const ok: PowerPlantState = powerPlantReducer(tripped(CstOil.TripPressure), { type: "RESET_TRIP", payload: { trip: "turbine" } })
      expect(isTripped(ok, "turbine")).toBe(false)
    })
  })
})
