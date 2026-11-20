import { describe, expect, test } from "vitest"
import { CstAuxiliary, CstOil, CstSimulation } from "./const"
import { isBusLive } from "./AuxiliaryBus"
import { makeInitialState, powerPlantReducer } from "./PowerPlantReducer"
import PowerPlantState from "./PowerPlantState"
import PowerPlantTick from "./PowerPlantTick"
import { netOutputOf } from "./AuxiliaryLoad"
import { loadAfter } from "../utils/turbineCalculations"

const cold: PowerPlantState = makeInitialState()

// Top of the ±2 rpm sync window: the cold plant has no steam, so one tick of load does not yet sag the unit out of it
const HighInWindow: number = CstSimulation.CstTurbine.SyncRPM + 1.5

// Every pump asked for, the oil header built and the gear in, with the supply as given
const pumping = (gridSupplyBreaker: boolean, generatorBreaker = false): PowerPlantState => ({
  ...cold,
  gridSupplyBreaker,
  Deaerator: { ...cold.Deaerator, feedPumpValvePosition: 0.5 },
  Condenser: { ...cold.Condenser, condensationPumpValvePosition: 0.5, recirculationPumpValvePosition: 0.5, isAirExtractionPumpEnabled: true },
  Oil: { pumpRunning: true, headerPressure: CstOil.NominalPressure },
  Turbine: { ...cold.Turbine, generatorBreaker, turningGearEngaged: true, rpm: 3 },
})

const loaded = (electricOutput: number, auxiliaryLoad: number, gridSupplyBreaker = true): PowerPlantState => ({
  ...cold,
  gridSupplyBreaker,
  auxiliaryLoad,
  Turbine: { ...cold.Turbine, generatorBreaker: true, electricOutput, loadSetpoint: electricOutput, rpm: HighInWindow },
})

describe("the auxiliary bus (#141)", () => {
  test("a new plant has the grid supply breaker closed", () => {
    expect(cold.gridSupplyBreaker).toBe(true)
  })

  test("the bus is live with either breaker closed, dead with both open", () => {
    expect(isBusLive({ ...cold, gridSupplyBreaker: true })).toBe(true)
    expect(isBusLive({ ...pumping(false, true) })).toBe(true)
    expect(isBusLive(pumping(false, false))).toBe(false)
  })

  test("closing the grid supply breaker is always allowed, opening it is a plain action", () => {
    expect(powerPlantReducer(pumping(false), { type: "CLOSE_GRID_SUPPLY_BREAKER" }).gridSupplyBreaker).toBe(true)
    expect(powerPlantReducer(loaded(20, 7), { type: "OPEN_GRID_SUPPLY_BREAKER" }).gridSupplyBreaker).toBe(false)
  })

  describe("opening the grid supply breaker (#182, house load operation)", () => {
    test("is never refused: not with the generator breaker open, not with the output below the auxiliary load", () => {
      const generatorOpen: PowerPlantState = { ...cold, gridSupplyBreaker: true }
      expect(powerPlantReducer(generatorOpen, { type: "OPEN_GRID_SUPPLY_BREAKER" }).gridSupplyBreaker).toBe(false)
      expect(powerPlantReducer(loaded(5, 7), { type: "OPEN_GRID_SUPPLY_BREAKER" }).gridSupplyBreaker).toBe(false)
    })

    test("with the generator breaker open as well the bus is dead", () => {
      const opened: PowerPlantState = powerPlantReducer({ ...cold, gridSupplyBreaker: true }, { type: "OPEN_GRID_SUPPLY_BREAKER" })
      expect(isBusLive(opened)).toBe(false)
    })
  })

  describe("the load setpoint in house load operation", () => {
    test("a command with the grid supply breaker open leaves the setpoint as the operator left it, whatever the value", () => {
      const state: PowerPlantState = loaded(20, 7, false)
      expect(powerPlantReducer(state, { type: "SET_LOAD_SETPOINT", payload: { loadSetpoint: 5 } })).toBe(state)
      expect(powerPlantReducer(state, { type: "SET_LOAD_SETPOINT", payload: { loadSetpoint: 50 } })).toBe(state)
    })

    test("with the grid supply breaker closed any setpoint is accepted", () => {
      const state: PowerPlantState = loaded(20, 7, true)
      expect(powerPlantReducer(state, { type: "SET_LOAD_SETPOINT", payload: { loadSetpoint: 0 } }).Turbine.loadSetpoint).toBe(0)
    })
  })

  describe("the shaft load in house load operation", () => {
    const island = (electricOutput: number, loadSetpoint: number, gridSupplyBreaker = false): PowerPlantState => {
      const base: PowerPlantState = loaded(electricOutput, 0, gridSupplyBreaker)
      return { ...base, Turbine: { ...base.Turbine, loadSetpoint, turningGearEngaged: false }, Oil: { pumpRunning: true, headerPressure: CstOil.NominalPressure } }
    }

    test("the load steps to the auxiliary load on the first tick, net output is 0, the setpoint is kept", () => {
      const ticked: PowerPlantState = PowerPlantTick(island(60, 60))
      expect(ticked.Turbine.electricOutput).toBeCloseTo(CstAuxiliary.LubeOilPump, 9)
      expect(ticked.Turbine.electricOutput).toBeCloseTo(ticked.auxiliaryLoad, 9)
      expect(netOutputOf(ticked)).toBeCloseTo(0, 9)
      expect(ticked.Turbine.loadSetpoint).toBe(60)
    })

    test("closing the generator breaker with the tie open puts the auxiliary load on the shaft on the next tick", () => {
      const dark: PowerPlantState = { ...island(0, 0), Turbine: { ...island(0, 0).Turbine, generatorBreaker: false } }
      const closed: PowerPlantState = powerPlantReducer(dark, { type: "TOGGLE_GENERATOR_BREAKER" })
      expect(closed.Turbine.generatorBreaker).toBe(true)
      expect(PowerPlantTick(closed).Turbine.electricOutput).toBeCloseTo(CstAuxiliary.LubeOilPump, 9)
    })

    test("closing the grid supply breaker ramps the load from the auxiliary load toward the kept setpoint at the load rate", () => {
      const first: PowerPlantState = PowerPlantTick(island(60, 60))
      const regained: PowerPlantState = powerPlantReducer(first, { type: "CLOSE_GRID_SUPPLY_BREAKER" })
      const next: PowerPlantState = PowerPlantTick(regained)
      expect(next.Turbine.electricOutput).toBeCloseTo(loadAfter(first.Turbine.electricOutput, 60), 9)
      expect(next.Turbine.electricOutput).toBeGreaterThan(first.Turbine.electricOutput)
      expect(next.Turbine.electricOutput).toBeLessThan(60)
    })
  })

  describe("a dead bus", () => {
    const live: PowerPlantState = PowerPlantTick(pumping(true))
    const dead: PowerPlantState = PowerPlantTick(pumping(false))

    test("the pumps deliver with the grid fed, and stop with both breakers open", () => {
      expect(live.Deaerator.outflowMass).toBeGreaterThan(0)
      expect(live.Condenser.returnRate).toBeGreaterThan(0)
      expect(dead.Deaerator.outflowMass).toBe(0)
      expect(dead.Condenser.returnRate).toBe(0)
      expect(dead.Condenser.coolingWaterOutletTemperature).toBe(cold.Condenser.coolingWaterOutletTemperature)
    })

    test("the generator alone carries the bus: the pumps run with the grid supply breaker open", () => {
      const onGenerator: PowerPlantState = pumping(false, true)
      const generated: PowerPlantState = PowerPlantTick({ ...onGenerator, Turbine: { ...onGenerator.Turbine, rpm: HighInWindow, turningGearEngaged: false } })
      expect(generated.Deaerator.outflowMass).toBeGreaterThan(0)
      expect(generated.auxiliaryLoad).toBeGreaterThan(0)
    })

    test("the lube oil pump stops: the header decays; the switch stays on", () => {
      expect(live.Oil.headerPressure).toBeCloseTo(CstOil.NominalPressure, 3)
      expect(dead.Oil.headerPressure).toBeLessThan(CstOil.NominalPressure)
      expect(dead.Oil.pumpRunning).toBe(true)
    })

    test("the turning gear motor stops and the gear drops out", () => {
      expect(live.Turbine.turningGearEngaged).toBe(true)
      expect(dead.Turbine.turningGearEngaged).toBe(false)
      expect(dead.Turbine.rpm).toBe(0)
    })

    test("the stored valve positions and the air pump switch stay as the operator set them, and nothing trips", () => {
      expect(dead.Deaerator.feedPumpValvePosition).toBe(0.5)
      expect(dead.Condenser.condensationPumpValvePosition).toBe(0.5)
      expect(dead.Condenser.recirculationPumpValvePosition).toBe(0.5)
      expect(dead.Condenser.isAirExtractionPumpEnabled).toBe(true)
      expect(dead.Deaerator.feedPumpTripped).toBe(false)
      expect(dead.Condenser.condensationPumpTripped).toBe(false)
      expect(dead.Turbine.turbineTripped).toBe(false)
    })

    test("draws no auxiliary load", () => {
      expect(live.auxiliaryLoad).toBeGreaterThan(CstAuxiliary.FeedPump / 2)
      expect(dead.auxiliaryLoad).toBe(0)
    })

    test("the turning gear cannot be engaged on a dead bus", () => {
      const state: PowerPlantState = { ...pumping(false), Turbine: { ...cold.Turbine, turningGearEngaged: false } }
      expect(powerPlantReducer(state, { type: "SET_TURNING_GEAR", payload: { engaged: true } }).Turbine.turningGearEngaged).toBe(false)
    })

    test("closing the grid supply breaker resumes the pumps at their set positions, with no reset; the gear stays out", () => {
      const fed: PowerPlantState = PowerPlantTick(powerPlantReducer(dead, { type: "CLOSE_GRID_SUPPLY_BREAKER" }))
      expect(fed.Deaerator.outflowMass).toBeGreaterThan(0)
      expect(fed.Condenser.returnRate).toBeGreaterThan(0)
      expect(fed.Deaerator.feedPumpValvePosition).toBe(0.5)
      expect(fed.Turbine.turningGearEngaged).toBe(false)
    })

    test("the generator breaker auto-opening on speed with the grid open leaves a dead bus", () => {
      const overspeed: PowerPlantState = { ...pumping(false, true), Turbine: { ...pumping(false, true).Turbine, rpm: 3100, electricOutput: 10, loadSetpoint: 10 } }
      const ticked: PowerPlantState = PowerPlantTick(overspeed)
      expect(ticked.Turbine.generatorBreaker).toBe(false)
      expect(isBusLive(ticked)).toBe(false)
      expect(ticked.auxiliaryLoad).toBe(0)
    })
  })
})
