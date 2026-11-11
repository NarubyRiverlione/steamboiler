import { describe, expect, test } from "vitest"
import { CstDeaerator, CstSimulation } from "./const"
import PowerPlantAction from "./PowerPlantActions"
import PowerPlantState, { SpeedMode } from "./PowerPlantState"
import PowerPlantTick from "./PowerPlantTick"
import { makeInitialState, powerPlantReducer } from "./PowerPlantReducer"
import { ratedOutputMW } from "../utils/turbineCalculations"

const { CstBoiler, CstCondenser, CstTurbine } = CstSimulation
const base = makeInitialState()
const reduce = (action: PowerPlantAction, state: PowerPlantState = base) => powerPlantReducer(state, action)

describe("powerPlantReducer", () => {
  test("SIMULATE_TICK advances the plant by one tick", () => {
    expect(reduce({ type: "SIMULATE_TICK" })).toEqual(PowerPlantTick(base))
  })

  test("LOAD_STATE replaces the whole state", () => {
    const burning: PowerPlantState = reduce({ type: "SET_GAS_RATE", payload: { gasRateCommand: 0.5 } })
    expect(reduce({ type: "LOAD_STATE", payload: { state: burning } })).toBe(burning)
    expect(reduce({ type: "LOAD_STATE", payload: { state: base } }, burning)).toBe(base)
  })

  describe("boiler", () => {
    test("the gas knob sets the rate command and leaves the gas flow to the tick", () => {
      const turned: PowerPlantState = reduce({ type: "SET_GAS_RATE", payload: { gasRateCommand: 0.6 } })
      expect(turned.Boiler.gasRateCommand).toBe(0.6)
      expect(turned.Boiler.gasFlow).toBe(0)
    })

    test("the command is clamped to the knob travel", () => {
      expect(reduce({ type: "SET_GAS_RATE", payload: { gasRateCommand: 7 } }).Boiler.gasRateCommand).toBe(1)
      expect(reduce({ type: "SET_GAS_RATE", payload: { gasRateCommand: -7 } }).Boiler.gasRateCommand).toBe(-1)
    })

    describe("burner trip", () => {
      const lowLowVolume: number = CstBoiler.TotalVolume * CstBoiler.BurnerLowLowLevel - 1
      const raise = (gasRateCommand: number): PowerPlantAction => ({
        type: "SET_GAS_RATE",
        payload: { gasRateCommand },
      })
      const tripped: PowerPlantState = {
        ...base,
        Boiler: { ...base.Boiler, waterVolume: lowLowVolume, burnerTripped: true },
      }

      test("turning the knob up is refused while the water is below the burner low-low level", () => {
        const next: PowerPlantState = reduce(raise(1), tripped)
        expect(next.Boiler.gasRateCommand).toBe(0)
        expect(next.Boiler.gasFlow).toBe(0)
        expect(next.Boiler.burnerTripped).toBe(true)
      })

      test("a trip in the tick centres the knob and zeroes the gas", () => {
        const burning: PowerPlantState = {
          ...base,
          Boiler: { ...base.Boiler, waterVolume: lowLowVolume, gasFlow: 5000, gasRateCommand: 0.8 },
        }
        const next: PowerPlantState = reduce({ type: "SIMULATE_TICK" }, burning)
        expect(next.Boiler.burnerTripped).toBe(true)
        expect(next.Boiler.gasFlow).toBe(0)
        expect(next.Boiler.gasRateCommand).toBe(0)
      })

      test("a raise past the dead zone once the water is back above the level clears the trip", () => {
        const refilled: PowerPlantState = {
          ...tripped,
          Boiler: { ...tripped.Boiler, waterVolume: lowLowVolume + 2 },
        }
        const next: PowerPlantState = reduce(raise(0.5), refilled)
        expect(next.Boiler.gasRateCommand).toBe(0.5)
        expect(next.Boiler.burnerTripped).toBe(false)
      })

      test("a deflection inside the dead zone does not restart the burner", () => {
        const refilled: PowerPlantState = {
          ...tripped,
          Boiler: { ...tripped.Boiler, waterVolume: lowLowVolume + 2 },
        }
        expect(reduce(raise(CstBoiler.GasRateDeadZone), refilled).Boiler.burnerTripped).toBe(true)
      })

      test("the gas ramps up from 0 after the restart", () => {
        const refilled: PowerPlantState = {
          ...tripped,
          Boiler: { ...tripped.Boiler, waterVolume: lowLowVolume + 2 },
        }
        const next: PowerPlantState = reduce({ type: "SIMULATE_TICK" }, reduce(raise(1), refilled))
        expect(next.Boiler.gasFlow).toBeGreaterThan(0)
        expect(next.Boiler.gasFlow).toBeLessThan(CstBoiler.GasRateMax)
      })

      test("centring or lowering the knob is always allowed and leaves the trip as it was", () => {
        for (const command of [0, -1]) {
          const next: PowerPlantState = reduce(raise(command), tripped)
          expect(next.Boiler.burnerTripped).toBe(true)
        }
      })
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

  describe("condensation pump low-low", () => {
    const lowLow = CstCondenser.HotwellLowLow
    const atLevel = (level: number, extra: Partial<PowerPlantState["Condenser"]> = {}): PowerPlantState => ({
      ...base,
      Condenser: { ...base.Condenser, hotwellWaterVolume: level * CstCondenser.TotalVolume, ...extra },
    })
    const pump = (delta: number, state: PowerPlantState) =>
      reduce({ type: "SET_CONDENSATION_PUMP_VALVE_POSITION", payload: { condensationPumpValvePosition: delta } }, state)
        .Condenser

    test("opening is refused below low-low and the state is unchanged", () => {
      const state = atLevel(lowLow - 0.01)
      expect(
        reduce(
          { type: "SET_CONDENSATION_PUMP_VALVE_POSITION", payload: { condensationPumpValvePosition: 0.1 } },
          state,
        ),
      ).toBe(state)
    })

    test("opening is allowed at and above low-low", () => {
      expect(pump(0.1, atLevel(lowLow)).condensationPumpValvePosition).toBe(0.1)
      expect(pump(0.1, atLevel(0.7)).condensationPumpValvePosition).toBe(0.1)
    })

    test("closing is allowed below low-low", () => {
      expect(pump(-0.1, atLevel(lowLow - 0.01, { condensationPumpValvePosition: 0.3 })).condensationPumpValvePosition).toBeCloseTo(0.2)
    })

    test("a successful opening clears the trip flag; a refused one and a closing leave it set", () => {
      const tripped = (level: number) => atLevel(level, { condensationPumpTripped: true })
      expect(pump(0.1, tripped(lowLow)).condensationPumpTripped).toBe(false)
      expect(pump(0.1, tripped(lowLow - 0.01)).condensationPumpTripped).toBe(true)
      expect(pump(-0.1, tripped(lowLow)).condensationPumpTripped).toBe(true)
    })
  })

  describe("feed pump (#112)", () => {
    const lowLow = CstDeaerator.LowLowLevel
    const atLevel = (level: number, extra: Partial<PowerPlantState["Deaerator"]> = {}): PowerPlantState => ({
      ...base,
      Deaerator: { ...base.Deaerator, waterVolume: level * CstDeaerator.TotalVolume, ...extra },
    })
    const pump = (delta: number, state: PowerPlantState): PowerPlantState["Deaerator"] =>
      reduce({ type: "SET_FEED_PUMP_VALVE_POSITION", payload: { feedPumpValvePosition: delta } }, state).Deaerator

    test("moves by its delta and stays within 0..1", () => {
      const opened = pump(0.25, atLevel(0.5))
      expect(opened.feedPumpValvePosition).toBe(0.25)
      expect(pump(-0.1, { ...base, Deaerator: opened }).feedPumpValvePosition).toBeCloseTo(0.15)
      expect(pump(5, atLevel(0.5)).feedPumpValvePosition).toBe(1)
      expect(pump(-5, { ...base, Deaerator: opened }).feedPumpValvePosition).toBe(0)
    })

    test("opening is refused below low-low and the state is unchanged", () => {
      const state = atLevel(lowLow - 0.01)
      expect(reduce({ type: "SET_FEED_PUMP_VALVE_POSITION", payload: { feedPumpValvePosition: 0.1 } }, state)).toBe(state)
    })

    test("opening is allowed at low-low and closing below it", () => {
      expect(pump(0.1, atLevel(lowLow)).feedPumpValvePosition).toBe(0.1)
      expect(pump(-0.1, atLevel(lowLow - 0.01, { feedPumpValvePosition: 0.3 })).feedPumpValvePosition).toBeCloseTo(0.2)
    })

    test("a successful opening clears the trip flag; a refused one and a closing leave it set", () => {
      const tripped = (level: number): PowerPlantState => atLevel(level, { feedPumpTripped: true })
      expect(pump(0.1, tripped(lowLow)).feedPumpTripped).toBe(false)
      expect(pump(0.1, tripped(lowLow - 0.01)).feedPumpTripped).toBe(true)
      expect(pump(-0.1, tripped(lowLow)).feedPumpTripped).toBe(true)
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
      // under vacuum, so the turbine valve may open
      const vacuum = { ...base, Condenser: { ...base.Condenser, pressure: CstCondenser.VacuumLimit } }
      const opened = reduce(act(0.3), vacuum)
      expect(opened.Turbine[field]).toBe(0.3)
      expect(reduce(act(5), vacuum).Turbine[field]).toBe(1)
      expect(reduce(act(-5), opened).Turbine[field]).toBe(0)
    })

    describe("overspeed limit", () => {
      const limit = CstSimulation.CstTurbine.MaxRPM
      // a good vacuum, so only the speed can refuse
      const atRpm = (rpm: number, turbineValvePosition = 0): PowerPlantState => ({
        ...base,
        Condenser: { ...base.Condenser, pressure: CstCondenser.VacuumLimit },
        Turbine: { ...base.Turbine, rpm, turbineValvePosition },
      })
      const turbineValve = (delta: number, state: PowerPlantState) =>
        reduce({ type: "ADJUST_STEAM_TURBINE_VALVE", payload: { turbineValvePosition: delta } }, state).Turbine

      test("opening is refused at the limit and above, and the state is unchanged", () => {
        for (const rpm of [limit, limit + 1]) {
          const state = atRpm(rpm, 0.2)
          expect(reduce({ type: "ADJUST_STEAM_TURBINE_VALVE", payload: { turbineValvePosition: 0.1 } }, state)).toBe(state)
        }
      })

      test("opening is allowed just below the limit", () => {
        expect(turbineValve(0.1, atRpm(limit - 0.1)).turbineValvePosition).toBe(0.1)
      })

      test("closing is always allowed", () => {
        expect(turbineValve(-0.1, atRpm(limit + 100, 0.3)).turbineValvePosition).toBeCloseTo(0.2)
      })

      test("a successful opening clears the trip flag; a refused one leaves it set", () => {
        const tripped = (rpm: number): PowerPlantState => {
          const state = atRpm(rpm)
          return { ...state, Turbine: { ...state.Turbine, turbineTripped: true } }
        }
        expect(turbineValve(0.1, tripped(limit - 1)).turbineTripped).toBe(false)
        expect(turbineValve(0.1, tripped(limit)).turbineTripped).toBe(true)
      })
    })

    describe("vacuum limit", () => {
      const limit = CstCondenser.VacuumLimit
      const atCondenser = (pressure: number, turbineValvePosition = 0): PowerPlantState => ({
        ...base,
        Condenser: { ...base.Condenser, pressure },
        Turbine: { ...base.Turbine, turbineValvePosition },
      })
      const turbineValve = (delta: number, state: PowerPlantState) =>
        reduce({ type: "ADJUST_STEAM_TURBINE_VALVE", payload: { turbineValvePosition: delta } }, state).Turbine

      test("the limit is 327 mbar absolute (-0.7 kg/cm² gauge, design-basis.md)", () => {
        expect(limit).toBe(327)
      })

      test("opening is refused just above the limit and the state is unchanged", () => {
        const state = atCondenser(limit + 0.1, 0.2)
        expect(reduce({ type: "ADJUST_STEAM_TURBINE_VALVE", payload: { turbineValvePosition: 0.1 } }, state)).toBe(
          state,
        )
      })

      test("opening is allowed at and just below the limit", () => {
        expect(turbineValve(0.1, atCondenser(limit)).turbineValvePosition).toBe(0.1)
        expect(turbineValve(0.1, atCondenser(limit - 0.1)).turbineValvePosition).toBe(0.1)
      })

      test("closing is allowed above the limit", () => {
        expect(turbineValve(-0.1, atCondenser(limit + 100, 0.3)).turbineValvePosition).toBeCloseTo(0.2)
      })

      test("a successful opening clears the trip flag; a refused one leaves it set", () => {
        const tripped = (pressure: number) => {
          const state = atCondenser(pressure)
          return { ...state, Turbine: { ...state.Turbine, turbineTripped: true } }
        }
        expect(turbineValve(0.1, tripped(limit)).turbineTripped).toBe(false)
        expect(turbineValve(0.1, tripped(limit + 1)).turbineTripped).toBe(true)
        expect(turbineValve(-0.1, tripped(limit)).turbineTripped).toBe(true)
      })
    })

    describe("speed modes", () => {
      const turbine = (patch: Partial<PowerPlantState["Turbine"]>): PowerPlantState => ({
        ...base,
        Turbine: { ...base.Turbine, ...patch },
      })
      const setMode = (speedMode: SpeedMode, state: PowerPlantState) =>
        reduce({ type: "SET_SPEED_MODE", payload: { speedMode } }, state)
      const select = (runUpPoint: number, state: PowerPlantState) =>
        reduce({ type: "SELECT_RUN_UP_POINT", payload: { runUpPoint } }, state)
      const open = { mainSteamValve: true }

      test("starts in Free at the default run-up point", () => {
        expect(base.Turbine.speedMode).toBe("free")
        expect(base.Turbine.runUpPoint).toBe(CstTurbine.SyncRPM)
        expect(CstTurbine.RunUpPoints).toEqual([500, 1500, 2500, 3000])
      })

      test("Free is always allowed", () => {
        for (const mode of ["rampUp", "hold"] as const) {
          expect(setMode("free", turbine({ ...open, speedMode: mode })).Turbine.speedMode).toBe("free")
        }
        expect(setMode("free", base)).toEqual(base)
      })

      test("Ramp up starts the reference at the current speed", () => {
        const next = setMode("rampUp", turbine({ ...open, rpm: 700, runUpPoint: 1500, pidIntegralError: 0.5 })).Turbine
        expect(next).toMatchObject({ speedMode: "rampUp", speedReference: 700, pidIntegralError: 0 })
      })

      test("Ramp up is refused with the main steam valve closed or a point not above the speed", () => {
        const closed = turbine({ rpm: 700, runUpPoint: 1500 })
        expect(setMode("rampUp", closed)).toBe(closed)
        for (const rpm of [1500, 1800]) {
          const notAbove = turbine({ ...open, rpm, runUpPoint: 1500 })
          expect(setMode("rampUp", notAbove)).toBe(notAbove)
        }
      })

      test("Hold engages within ±5 rpm of the point and is refused outside it", () => {
        const window = CstTurbine.HoldEngageWindow
        expect(window).toBe(5)
        for (const rpm of [1500 - window, 1500, 1500 + window]) {
          const next = setMode("hold", turbine({ ...open, rpm, runUpPoint: 1500 })).Turbine
          expect(next).toMatchObject({ speedMode: "hold", speedReference: 1500 })
        }
        for (const rpm of [1500 - window - 1, 1500 + window + 1]) {
          const outside = turbine({ ...open, rpm, runUpPoint: 1500 })
          expect(setMode("hold", outside)).toBe(outside)
        }
      })

      test("selecting a point in Free only selects the target", () => {
        const next = select(2500, turbine({ rpm: 3000 })).Turbine
        expect(next).toMatchObject({ runUpPoint: 2500, speedMode: "free" })
      })

      test("a value that is not a run-up point is refused", () => {
        expect(select(1234, base)).toBe(base)
      })

      test("a point above the speed starts Ramp up from Hold, from the current speed", () => {
        const hold = turbine({ ...open, speedMode: "hold", rpm: 500, runUpPoint: 500, speedReference: 500 })
        expect(select(1500, hold).Turbine).toMatchObject({
          runUpPoint: 1500,
          speedMode: "rampUp",
          speedReference: 500,
        })
      })

      test("a point above the speed retargets a running Ramp up and keeps its reference and integral", () => {
        const ramp = turbine({ ...open, speedMode: "rampUp", rpm: 900, runUpPoint: 1500, speedReference: 920, pidIntegralError: 0.2 })
        expect(select(2500, ramp).Turbine).toMatchObject({
          runUpPoint: 2500,
          speedMode: "rampUp",
          speedReference: 920,
          pidIntegralError: 0.2,
        })
      })

      test("a point at or below the speed is refused in Ramp up and Hold", () => {
        for (const speedMode of ["rampUp", "hold"] as const) {
          for (const point of [500, 1500]) {
            const state = turbine({ ...open, speedMode, rpm: 1500, runUpPoint: 2500, speedReference: 1500 })
            expect(select(point, state)).toBe(state)
          }
        }
      })

      test("a point is refused in Ramp up or Hold with the main steam valve closed", () => {
        const state = turbine({ speedMode: "hold", rpm: 500, runUpPoint: 500 })
        expect(select(1500, state)).toBe(state)
      })
    })

    describe("generator breaker", () => {
      const atRpm = (rpm: number): PowerPlantState => ({ ...base, Turbine: { ...base.Turbine, rpm } })
      const toggle = (state: PowerPlantState) => reduce({ type: "TOGGLE_GENERATOR_BREAKER" }, state).Turbine

      test("closes only within the RPM margin of sync speed", () => {
        const margin = CstTurbine.BreakerRPMMargin
        expect(CstTurbine.SyncRPM).toBe(3000)
        expect(toggle(atRpm(CstTurbine.SyncRPM)).generatorBreaker).toBe(true)
        expect(toggle(atRpm(CstTurbine.SyncRPM - margin)).generatorBreaker).toBe(true)
        expect(toggle(atRpm(CstTurbine.SyncRPM + margin)).generatorBreaker).toBe(true)
        expect(toggle(atRpm(CstTurbine.SyncRPM - margin - 1)).generatorBreaker).toBe(false)
        expect(toggle(atRpm(CstTurbine.SyncRPM + margin + 1)).generatorBreaker).toBe(false)
        expect(toggle(atRpm(CstTurbine.MaxRPM)).generatorBreaker).toBe(false)
        expect(toggle(atRpm(0)).generatorBreaker).toBe(false)
      })

      test("opens when closed", () => {
        const closed = reduce({ type: "TOGGLE_GENERATOR_BREAKER" }, atRpm(CstTurbine.SyncRPM))
        expect(toggle(closed).generatorBreaker).toBe(false)
      })
    })
  })

  describe("load setpoint", () => {
    const withTurbine = (patch: Partial<PowerPlantState["Turbine"]>): PowerPlantState => ({
      ...base,
      Turbine: { ...base.Turbine, ...patch },
    })
    const setLoad = (loadSetpoint: number, state: PowerPlantState) =>
      reduce({ type: "SET_LOAD_SETPOINT", payload: { loadSetpoint } }, state)

    test("is refused with the breaker open and leaves the state unchanged", () => {
      const state = withTurbine({ generatorBreaker: false })
      expect(setLoad(50, state)).toBe(state)
    })

    test("is set with the breaker closed, in any speed mode", () => {
      for (const speedMode of ["free", "rampUp", "hold"] as const) {
        const state = withTurbine({ generatorBreaker: true, speedMode })
        expect(setLoad(50, state).Turbine.loadSetpoint).toBe(50)
      }
    })

    test("is limited to 0 up to the load setpoint limit, above the rated output", () => {
      const state = withTurbine({ generatorBreaker: true })
      expect(setLoad(-5, state).Turbine.loadSetpoint).toBe(0)
      expect(setLoad(1000, state).Turbine.loadSetpoint).toBe(CstTurbine.LoadSetpointLimit)
      expect(CstTurbine.LoadSetpointLimit).toBeGreaterThan(ratedOutputMW)
    })

    test("opening the breaker by hand drops the load and the setpoint to 0", () => {
      const state = withTurbine({ generatorBreaker: true, rpm: CstTurbine.SyncRPM, electricOutput: 40, loadSetpoint: 60 })
      const opened = reduce({ type: "TOGGLE_GENERATOR_BREAKER" }, state).Turbine
      expect(opened.generatorBreaker).toBe(false)
      expect(opened.electricOutput).toBe(0)
      expect(opened.loadSetpoint).toBe(0)
    })

    test("closing the breaker starts with no load", () => {
      const closed = reduce({ type: "TOGGLE_GENERATOR_BREAKER" }, withTurbine({ rpm: CstTurbine.SyncRPM })).Turbine
      expect(closed.generatorBreaker).toBe(true)
      expect(closed.loadSetpoint).toBe(0)
    })
  })

  describe("deaerator", () => {
    test("the start-up vent opens and closes on the toggle, and nothing else changes", () => {
      const opened: PowerPlantState = reduce({ type: "TOGGLE_DEAERATOR_VENT" })
      expect(opened.Deaerator.startUpVentOpen).toBe(true)
      expect({ ...opened.Deaerator, startUpVentOpen: false }).toEqual(base.Deaerator)
      expect(reduce({ type: "TOGGLE_DEAERATOR_VENT" }, opened).Deaerator.startUpVentOpen).toBe(false)
      expect(opened.Boiler).toBe(base.Boiler)
    })

    test("the cold plant starts with the vent shut and the vessel full of air at atmospheric pressure", () => {
      expect(base.Deaerator.startUpVentOpen).toBe(false)
      expect(base.Deaerator.airMass).toBeGreaterThan(100)
      expect(base.Deaerator.pressure).toBeCloseTo(1.01325, 5)
    })
  })

  test("leaves the other subsystems untouched", () => {
    const next = reduce({ type: "SELECT_RUN_UP_POINT", payload: { runUpPoint: 500 } })
    expect(next.Boiler).toBe(base.Boiler)
    expect(next.Condenser).toBe(base.Condenser)
  })
})
