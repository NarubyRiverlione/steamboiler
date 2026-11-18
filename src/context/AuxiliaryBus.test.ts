import { describe, expect, test } from "vitest"
import { CstAuxiliary, CstOil, CstSimulation } from "./const"
import { gridSupplyOpenRefusal, isBusLive, loadSetpointFloorRefusal } from "./AuxiliaryBus"
import { makeInitialState, powerPlantReducer } from "./PowerPlantReducer"
import PowerPlantState from "./PowerPlantState"
import PowerPlantTick from "./PowerPlantTick"

const cold: PowerPlantState = makeInitialState()

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
  Turbine: { ...cold.Turbine, generatorBreaker: true, electricOutput, loadSetpoint: electricOutput, rpm: CstSimulation.CstTurbine.SyncRPM },
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

  describe("opening the grid supply breaker", () => {
    test("is refused with the generator breaker open", () => {
      expect(gridSupplyOpenRefusal({ ...loaded(20, 7), Turbine: { ...cold.Turbine, generatorBreaker: false } })).toBeTypeOf("string")
      const refused: PowerPlantState = { ...cold, gridSupplyBreaker: true }
      expect(powerPlantReducer(refused, { type: "OPEN_GRID_SUPPLY_BREAKER" })).toBe(refused)
    })

    test("is refused while the actual electric output is below the auxiliary load, whatever the setpoint", () => {
      const state: PowerPlantState = { ...loaded(5, 7), Turbine: { ...loaded(5, 7).Turbine, loadSetpoint: 30 } }
      expect(gridSupplyOpenRefusal(state)).toBeTypeOf("string")
      expect(powerPlantReducer(state, { type: "OPEN_GRID_SUPPLY_BREAKER" })).toBe(state)
    })

    test("is allowed with the generator breaker closed and the output at or above the auxiliary load", () => {
      expect(gridSupplyOpenRefusal(loaded(7, 7))).toBeUndefined()
      expect(gridSupplyOpenRefusal(loaded(20, 7))).toBeUndefined()
    })

    test("is a no-op when already open", () => {
      expect(gridSupplyOpenRefusal(loaded(20, 7, false))).toBeUndefined()
    })
  })

  describe("the load setpoint floor", () => {
    test("with the breaker open a setpoint below the auxiliary load is refused with a reason", () => {
      const state: PowerPlantState = loaded(20, 7, false)
      expect(loadSetpointFloorRefusal(state, 5)).toBeTypeOf("string")
      expect(powerPlantReducer(state, { type: "SET_LOAD_SETPOINT", payload: { loadSetpoint: 5 } })).toBe(state)
    })

    test("with the breaker open a setpoint at or above the auxiliary load is accepted", () => {
      const state: PowerPlantState = loaded(20, 7, false)
      expect(loadSetpointFloorRefusal(state, 7)).toBeUndefined()
      expect(powerPlantReducer(state, { type: "SET_LOAD_SETPOINT", payload: { loadSetpoint: 15 } }).Turbine.loadSetpoint).toBe(15)
    })

    test("with the breaker closed any setpoint is accepted", () => {
      const state: PowerPlantState = loaded(20, 7, true)
      expect(loadSetpointFloorRefusal(state, 0)).toBeUndefined()
      expect(powerPlantReducer(state, { type: "SET_LOAD_SETPOINT", payload: { loadSetpoint: 0 } }).Turbine.loadSetpoint).toBe(0)
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
      const generated: PowerPlantState = PowerPlantTick({ ...onGenerator, Turbine: { ...onGenerator.Turbine, rpm: CstSimulation.CstTurbine.SyncRPM, turningGearEngaged: false } })
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
