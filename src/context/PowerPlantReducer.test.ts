import { describe, expect, test } from "vitest"
import { CstSimulation } from "./const"
import PowerPlantAction from "./PowerPlantActions"
import PowerPlantState from "./PowerPlantState"
import PowerPlantTick from "./PowerPlantTick"
import { makeInitialState, powerPlantReducer } from "./PowerPlantReducer"

const { CstBoiler, CstTurbine } = CstSimulation
const base = makeInitialState()
const reduce = (action: PowerPlantAction, state: PowerPlantState = base) => powerPlantReducer(state, action)

describe("powerPlantReducer", () => {
  test("SIMULATE_TICK advances the plant by one tick", () => {
    expect(reduce({ type: "SIMULATE_TICK" })).toEqual(PowerPlantTick(base))
  })

  describe("boiler", () => {
    test("gas flow increases, capped at MaxGasFlow", () => {
      expect(reduce({ type: "INCREASE_GAS_FLOW", amount: 500 }).Boiler.gasFlow).toBe(500)
      expect(reduce({ type: "INCREASE_GAS_FLOW", amount: CstBoiler.MaxGasFlow + 1 }).Boiler.gasFlow).toBe(
        CstBoiler.MaxGasFlow,
      )
    })

    test("gas flow decreases, floored at 0", () => {
      const burning = reduce({ type: "INCREASE_GAS_FLOW", amount: 1000 })
      expect(reduce({ type: "DECREASE_GAS_FLOW", amount: 400 }, burning).Boiler.gasFlow).toBe(600)
      expect(reduce({ type: "DECREASE_GAS_FLOW", amount: 5000 }, burning).Boiler.gasFlow).toBe(0)
    })

    test("drain valve toggles", () => {
      const opened = reduce({ type: "TOGGLE_DRAIN_VALVE" })
      expect(opened.Boiler.drainValveOpen).toBe(true)
      expect(reduce({ type: "TOGGLE_DRAIN_VALVE" }, opened).Boiler.drainValveOpen).toBe(false)
    })
  })

  describe("condenser", () => {
    test("air extraction pump and SJAE are set on and off", () => {
      const on = reduce({ type: "SET_AIR_EXTRACTION_PUMP_ENABLED", payload: { isAirExtractionPumpEnabled: true } })
      expect(on.Condenser.isAirExtractionPumpEnabled).toBe(true)
      expect(
        reduce({ type: "SET_AIR_EXTRACTION_PUMP_ENABLED", payload: { isAirExtractionPumpEnabled: false } }, on)
          .Condenser.isAirExtractionPumpEnabled,
      ).toBe(false)
      expect(reduce({ type: "SET_SJAE_ENABLED", payload: { isSjaeEnabled: true } }).Condenser.isSjaeEnabled).toBe(
        true,
      )
    })

    const valves = [
      (delta: number): PowerPlantAction => ({ type: "SET_SJAE_VALVE_POSITION", payload: { sjaeValvePosition: delta } }),
      (delta: number): PowerPlantAction => ({
        type: "SET_RECIRCULATION_PUMP_VALVE_POSITION",
        payload: { recirculationPumpValvePosition: delta },
      }),
      (delta: number): PowerPlantAction => ({
        type: "SET_CONDENSATION_PUMP_VALVE_POSITION",
        payload: { condensationPumpValvePosition: delta },
      }),
      (delta: number): PowerPlantAction => ({
        type: "SET_MAKEUP_VALVE_POSITION",
        payload: { makeupValvePosition: delta },
      }),
      (delta: number): PowerPlantAction => ({
        type: "SET_REJECT_VALVE_POSITION",
        payload: { rejectValvePosition: delta },
      }),
    ]
    const fields = [
      "sjaeValvePosition",
      "recirculationPumpValvePosition",
      "condensationPumpValvePosition",
      "makeupValvePosition",
      "rejectValvePosition",
    ] as const

    test.each([0, 1, 2, 3, 4])("valve %i moves by its delta and stays within 0..1", (i) => {
      const position = (s: PowerPlantState) => s.Condenser[fields[i]]
      const opened = reduce(valves[i](0.25))
      expect(position(opened)).toBe(0.25)
      expect(position(reduce(valves[i](-0.1), opened))).toBeCloseTo(0.15)
      expect(position(reduce(valves[i](5)))).toBe(1)
      expect(position(reduce(valves[i](-5), opened))).toBe(0)
    })
  })

  describe("turbine", () => {
    const atPressure = (pressure: number): PowerPlantState => ({ ...base, Boiler: { ...base.Boiler, pressure } })

    test("main steam valve only opens above the minimum pressure", () => {
      const min = CstTurbine.MainSteamValveMinimumPressure
      expect(reduce({ type: "TOGGLE_MAIN_STEAM_VALVE" }, atPressure(min)).Turbine.mainSteamValve).toBe(false)
      expect(reduce({ type: "TOGGLE_MAIN_STEAM_VALVE" }, atPressure(min + 0.1)).Turbine.mainSteamValve).toBe(true)
    })

    test("main steam valve closes when open, at any pressure", () => {
      const open = reduce({ type: "TOGGLE_MAIN_STEAM_VALVE" }, atPressure(20))
      expect(reduce({ type: "TOGGLE_MAIN_STEAM_VALVE" }, open).Turbine.mainSteamValve).toBe(false)
      const openLowPressure = { ...open, Boiler: { ...open.Boiler, pressure: 1 } }
      expect(reduce({ type: "TOGGLE_MAIN_STEAM_VALVE" }, openLowPressure).Turbine.mainSteamValve).toBe(false)
    })

    test.each([
      ["ADJUST_STEAM_BYPASS_VALVE", "bypassValvePosition"],
      ["ADJUST_STEAM_TURBINE_VALVE", "turbineValvePosition"],
    ] as const)("%s moves %s by its delta and stays within 0..1", (type, field) => {
      const act = (delta: number): PowerPlantAction =>
        type === "ADJUST_STEAM_BYPASS_VALVE"
          ? { type, payload: { bypassValvePosition: delta } }
          : { type, payload: { turbineValvePosition: delta } }
      const opened = reduce(act(0.3))
      expect(opened.Turbine[field]).toBe(0.3)
      expect(reduce(act(5)).Turbine[field]).toBe(1)
      expect(reduce(act(-5), opened).Turbine[field]).toBe(0)
    })

    test("RPM setpoint adjusts within MinRPM..MaxRPM", () => {
      const adjust = (rpmAdjustment: number, state?: PowerPlantState) =>
        reduce({ type: "ADJUST_RPM_SETPOINT", payload: { rpmAdjustment } }, state)
      expect(adjust(100).Turbine.rpmSetPoint).toBe(CstTurbine.DefaultRPMSetPoint + 100)
      expect(adjust(1e6).Turbine.rpmSetPoint).toBe(CstTurbine.MaxRPM)
      expect(adjust(-1e6).Turbine.rpmSetPoint).toBe(CstTurbine.MinRPM)
    })

    test("hold mode toggles", () => {
      const on = reduce({ type: "TOGGLE_HOLD_MODE" })
      expect(on.Turbine.holdMode).toBe(true)
      expect(reduce({ type: "TOGGLE_HOLD_MODE" }, on).Turbine.holdMode).toBe(false)
    })

    describe("generator breaker", () => {
      const atRpm = (rpm: number): PowerPlantState => ({ ...base, Turbine: { ...base.Turbine, rpm } })
      const toggle = (state: PowerPlantState) => reduce({ type: "TOGGLE_GENERATOR_BREAKER" }, state).Turbine

      test("closes only within the RPM margin of MaxRPM", () => {
        const margin = CstTurbine.BreakerRPMMargin
        expect(toggle(atRpm(CstTurbine.MaxRPM)).generatorBreaker).toBe(true)
        expect(toggle(atRpm(CstTurbine.MaxRPM - margin)).generatorBreaker).toBe(true)
        expect(toggle(atRpm(CstTurbine.MaxRPM + margin)).generatorBreaker).toBe(true)
        expect(toggle(atRpm(CstTurbine.MaxRPM - margin - 1)).generatorBreaker).toBe(false)
        expect(toggle(atRpm(0)).generatorBreaker).toBe(false)
      })

      test("opens when closed", () => {
        const closed = reduce({ type: "TOGGLE_GENERATOR_BREAKER" }, atRpm(CstTurbine.MaxRPM))
        expect(toggle(closed).generatorBreaker).toBe(false)
      })
    })
  })

  test("leaves the other subsystems untouched", () => {
    const next = reduce({ type: "TOGGLE_HOLD_MODE" })
    expect(next.Boiler).toBe(base.Boiler)
    expect(next.Condenser).toBe(base.Condenser)
  })
})
