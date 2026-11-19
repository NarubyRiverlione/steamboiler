import { describe, expect, test } from "vitest"
import { CstSimulation, CstUps } from "./const"
import { isSafetyBusLive, isVitalBusLive, upsChargeAfter } from "./SafetyBus"
import { makeInitialState, powerPlantReducer } from "./PowerPlantReducer"
import PowerPlantState from "./PowerPlantState"
import PowerPlantTick from "./PowerPlantTick"
import { runTicks } from "./PowerPlantBatch"

const base: PowerPlantState = makeInitialState()
const dark = (patch: Partial<PowerPlantState> = {}): PowerPlantState => ({ ...base, gridSupplyBreaker: false, ...patch })
const perTick = (seconds: number): number => (100 / seconds) * CstSimulation.DeltaTime

describe("the vital bus and the safety bus (#143)", () => {
  test("the vital bus follows the Auxiliary bus", () => {
    expect(isVitalBusLive(base)).toBe(true)
    expect(isVitalBusLive(dark())).toBe(false)
  })

  test("the safety bus is live only with the UPS breaker closed and charge above 0", () => {
    expect(isSafetyBusLive(base)).toBe(true)
    expect(isSafetyBusLive({ ...base, upsBreaker: false })).toBe(false)
    expect(isSafetyBusLive({ ...base, upsCharge: 0 })).toBe(false)
  })

  test("the default state has the UPS full and the simulation running", () => {
    expect(base.upsCharge).toBe(100)
    expect(base.simulationEnded).toBe(false)
  })

  describe("the UPS charge", () => {
    test("drains at 100% per nominal runtime with the breaker closed and the bus dead", () => {
      expect(upsChargeAfter(dark())).toBeCloseTo(100 - perTick(CstUps.NominalRuntime), 10)
    })
    test("does not drain with the breaker open", () => {
      expect(upsChargeAfter(dark({ upsBreaker: false }))).toBe(100)
    })
    test("recharges at the fixed rate while the bus is live, breaker open or closed, and stops at 100", () => {
      expect(upsChargeAfter({ ...base, upsCharge: 50 })).toBeCloseTo(50 + perTick(CstUps.RechargeTime), 10)
      expect(upsChargeAfter({ ...base, upsCharge: 50, upsBreaker: false })).toBeGreaterThan(50)
      expect(upsChargeAfter(base)).toBe(100)
    })
    test("a tick moves the charge", () => {
      expect(PowerPlantTick(dark()).upsCharge).toBeLessThan(100)
    })
  })

  describe("0% ends the simulation", () => {
    test("the tick that reaches 0 sets simulationEnded and later ticks change nothing", () => {
      const last: PowerPlantState = dark({ upsCharge: perTick(CstUps.NominalRuntime) })
      const ended: PowerPlantState = PowerPlantTick(last)
      expect(ended.upsCharge).toBe(0)
      expect(ended.simulationEnded).toBe(true)
      expect(PowerPlantTick(ended)).toBe(ended)
    })
    test("a batch stops on the ending tick", () => {
      const { ticksRun, state } = runTicks(dark({ upsCharge: 2 * perTick(CstUps.NominalRuntime) }), 50)
      expect(ticksRun).toBe(2)
      expect(state.simulationEnded).toBe(true)
    })
    test("with the UPS breaker open the charge never ends the simulation", () => {
      expect(PowerPlantTick(dark({ upsBreaker: false, upsCharge: 0 })).simulationEnded).toBe(false)
    })
  })

  describe("the UPS breaker", () => {
    test("works on a dead safety bus, both ways", () => {
      const open: PowerPlantState = powerPlantReducer(dark(), { type: "OPEN_UPS_BREAKER" })
      expect(open.upsBreaker).toBe(false)
      expect(powerPlantReducer(open, { type: "CLOSE_UPS_BREAKER" }).upsBreaker).toBe(true)
    })
  })

  describe("breaker commands on a dead safety bus do nothing", () => {
    const noPower: PowerPlantState = { ...base, upsBreaker: false, gridSupplyBreaker: false }
    test("grid supply close and open", () => {
      expect(powerPlantReducer(noPower, { type: "CLOSE_GRID_SUPPLY_BREAKER" })).toBe(noPower)
      const closed: PowerPlantState = { ...noPower, gridSupplyBreaker: true }
      expect(powerPlantReducer(closed, { type: "OPEN_GRID_SUPPLY_BREAKER" })).toBe(closed)
    })
    test("generator breaker toggle", () => {
      const syncing: PowerPlantState = { ...noPower, Turbine: { ...noPower.Turbine, rpm: CstSimulation.CstTurbine.SyncRPM } }
      expect(powerPlantReducer(syncing, { type: "TOGGLE_GENERATOR_BREAKER" })).toBe(syncing)
      const live: PowerPlantState = { ...syncing, upsBreaker: true }
      expect(powerPlantReducer(live, { type: "TOGGLE_GENERATOR_BREAKER" }).Turbine.generatorBreaker).toBe(true)
    })
    test("trip reset", () => {
      const tripped: PowerPlantState = { ...noPower, Boiler: { ...noPower.Boiler, burnerTripped: true } }
      expect(powerPlantReducer(tripped, { type: "RESET_TRIP", payload: { trip: "burner" } })).toBe(tripped)
      expect(powerPlantReducer({ ...tripped, upsBreaker: true }, { type: "RESET_TRIP", payload: { trip: "burner" } }).Boiler.burnerTripped).toBe(false)
    })
  })

  describe("the controller controls need the vital bus", () => {
    const deadVital: PowerPlantState = { ...base, gridSupplyBreaker: false, Turbine: { ...base.Turbine, generatorBreaker: false, rpm: 1000 } }
    test("speed mode and run-up point freeze", () => {
      expect(powerPlantReducer(deadVital, { type: "SET_SPEED_MODE", payload: { speedMode: "rampUp" } })).toBe(deadVital)
      expect(powerPlantReducer(deadVital, { type: "SELECT_RUN_UP_POINT", payload: { runUpPoint: 1500 } })).toBe(deadVital)
    })
  })

  test("the pump and valve knobs need no control power", () => {
    const noPower: PowerPlantState = { ...base, upsBreaker: false }
    expect(powerPlantReducer(noPower, { type: "SET_OIL_PUMP", payload: { pumpRunning: true } }).Oil.pumpRunning).toBe(true)
  })
})
