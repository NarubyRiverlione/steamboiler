import { describe, expect, test } from "vitest"
import { CstDeaerator, CstSimulation } from "./const"
import { makeInitialState, powerPlantReducer } from "./PowerPlantReducer"
import PowerPlantState from "./PowerPlantState"
import { isTripped, tripResetRefusal, type TripId } from "./tripReset"

const { CstBoiler, CstCondenser, CstTurbine } = CstSimulation
const base: PowerPlantState = makeInitialState()
const reset = (state: PowerPlantState, trip: TripId): PowerPlantState => powerPlantReducer(state, { type: "RESET_TRIP", payload: { trip } })

const boilerAt = (level: number, extra: Partial<PowerPlantState["Boiler"]> = {}): PowerPlantState => ({
  ...base,
  Boiler: { ...base.Boiler, waterVolume: level * CstBoiler.TotalVolume, ...extra },
})

describe("trip reset (ADR 0043)", () => {
  describe("burner", () => {
    const tripped = (level: number): PowerPlantState => boilerAt(level, { burnerTripped: true, gasRateCommand: 0, gasFlow: 0 })

    test("refused below the burner low-low level, allowed at it", () => {
      const low: PowerPlantState = tripped(CstBoiler.BurnerLowLowLevel - 0.01)
      expect(tripResetRefusal(low, "burner")).toBeDefined()
      expect(reset(low, "burner")).toBe(low)
      expect(reset(tripped(CstBoiler.BurnerLowLowLevel), "burner").Boiler.burnerTripped).toBe(false)
    })

    test("only clears the flag: gas and knob stay at 0", () => {
      const next: PowerPlantState = reset(tripped(0.5), "burner")
      expect(next).toEqual({ ...tripped(0.5), Boiler: { ...tripped(0.5).Boiler, burnerTripped: false } })
    })

    test("untripped is a no-op", () => {
      const state: PowerPlantState = boilerAt(0.5)
      expect(reset(state, "burner")).toBe(state)
    })
  })

  describe("boiler high-high", () => {
    const tripped = (level: number): PowerPlantState => boilerAt(level, { boilerLevelHighTripped: true })

    test("refused at the high-high level, allowed below it", () => {
      const high: PowerPlantState = tripped(CstBoiler.HighHighLevel)
      expect(reset(high, "boilerHighHigh")).toBe(high)
      expect(reset(tripped(CstBoiler.HighHighLevel - 0.01), "boilerHighHigh").Boiler.boilerLevelHighTripped).toBe(false)
    })
  })

  describe("feed pump", () => {
    const tripped = (level: number): PowerPlantState => ({
      ...base,
      Deaerator: { ...base.Deaerator, waterVolume: level * CstDeaerator.TotalVolume, feedPumpTripped: true },
    })

    test("refused below low-low, allowed at it, valve stays shut", () => {
      const low: PowerPlantState = tripped(CstDeaerator.LowLowLevel - 0.01)
      expect(reset(low, "feedPump")).toBe(low)
      const next: PowerPlantState = reset(tripped(CstDeaerator.LowLowLevel), "feedPump")
      expect(next.Deaerator.feedPumpTripped).toBe(false)
      expect(next.Deaerator.feedPumpValvePosition).toBe(0)
    })
  })

  describe("condensation pump", () => {
    const tripped = (level: number): PowerPlantState => ({
      ...base,
      Condenser: { ...base.Condenser, hotwellWaterVolume: level * CstCondenser.TotalVolume, condensationPumpTripped: true },
    })

    test("refused below low-low, allowed at it, valve stays shut", () => {
      const low: PowerPlantState = tripped(CstCondenser.HotwellLowLow - 0.01)
      expect(reset(low, "condensationPump")).toBe(low)
      const next: PowerPlantState = reset(tripped(CstCondenser.HotwellLowLow), "condensationPump")
      expect(next.Condenser.condensationPumpTripped).toBe(false)
      expect(next.Condenser.condensationPumpValvePosition).toBe(0)
    })
  })

  describe("turbine", () => {
    const tripped = (condenserPressure: number, rpm: number, boilerLevel = 0.5): PowerPlantState => ({
      ...base,
      Boiler: { ...base.Boiler, waterVolume: boilerLevel * CstBoiler.TotalVolume },
      Condenser: { ...base.Condenser, pressure: condenserPressure },
      Turbine: { ...base.Turbine, rpm, turbineTripped: true },
    })

    test("refused while the vacuum is above the limit, allowed at it", () => {
      const state: PowerPlantState = tripped(CstCondenser.VacuumLimit + 1, 0)
      expect(reset(state, "turbine")).toBe(state)
      expect(reset(tripped(CstCondenser.VacuumLimit, 0), "turbine").Turbine.turbineTripped).toBe(false)
    })

    test("refused at overspeed, allowed just below", () => {
      const state: PowerPlantState = tripped(100, CstTurbine.MaxRPM)
      expect(reset(state, "turbine")).toBe(state)
      expect(reset(tripped(100, CstTurbine.MaxRPM - 1), "turbine").Turbine.turbineTripped).toBe(false)
    })

    test("refused while the boiler is at the high-high level", () => {
      const state: PowerPlantState = tripped(100, 0, CstBoiler.HighHighLevel)
      expect(reset(state, "turbine")).toBe(state)
    })

    test("a trip with no persistent cause (low-pressure closure) is never blocked, valve stays shut", () => {
      const next: PowerPlantState = reset(tripped(100, 1000), "turbine")
      expect(next.Turbine.turbineTripped).toBe(false)
      expect(next.Turbine.turbineValvePosition).toBe(0)
    })

    test("is live: every cause must be gone", () => {
      expect(tripResetRefusal(tripped(CstCondenser.VacuumLimit + 1, CstTurbine.MaxRPM, CstBoiler.HighHighLevel), "turbine")).toBeDefined()
    })
  })

  test("isTripped reads each flag", () => {
    const ids: TripId[] = ["burner", "boilerHighHigh", "feedPump", "condensationPump", "turbine"]
    expect(ids.map((id: TripId) => isTripped(base, id))).toEqual([false, false, false, false, false])
  })
})
