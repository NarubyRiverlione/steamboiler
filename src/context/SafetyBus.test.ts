import { describe, expect, test } from "vitest"
import { CstSimulation, CstUps } from "./const"
import { isBatteryFeeding, isSafetyBusLive, isVitalBusLive, settleEmergencyChain, upsChargeAfter } from "./SafetyBus"
import { isBusLive } from "./AuxiliaryBus"
import { makeInitialState, powerPlantReducer } from "./PowerPlantReducer"
import PowerPlantState from "./PowerPlantState"
import PowerPlantTick from "./PowerPlantTick"
import { runTicks } from "./PowerPlantBatch"

const base: PowerPlantState = makeInitialState()
// The grid lost: the Auxiliary bus is dead, the chain not yet settled
const gridLost = (patch: Partial<PowerPlantState> = {}): PowerPlantState => ({ ...base, gridSupplyBreaker: false, ...patch })
// The chain settled on a dead Auxiliary bus: both breakers open, the battery feeds
const onBattery = (patch: Partial<PowerPlantState> = {}): PowerPlantState => gridLost({ vitalFeedBreaker: false, safetyFeedBreaker: false, ...patch })
// The Auxiliary bus back, the hand-back not done yet
const gridBack = (patch: Partial<PowerPlantState> = {}): PowerPlantState => ({ ...base, vitalFeedBreaker: false, safetyFeedBreaker: false, ...patch })
const perTick = (seconds: number): number => (100 / seconds) * CstSimulation.DeltaTime

describe("the emergency power chain (#196)", () => {
  test("the default state: both breakers closed, UPS full, simulation running", () => {
    expect(base.vitalFeedBreaker).toBe(true)
    expect(base.safetyFeedBreaker).toBe(true)
    expect(base.upsCharge).toBe(100)
    expect(base.simulationEnded).toBe(false)
  })

  describe("the Vital bus", () => {
    test("is live only with Aux→Vital closed and the Auxiliary bus live", () => {
      expect(isVitalBusLive(base)).toBe(true)
      expect(isVitalBusLive(gridBack())).toBe(false)
      expect(isVitalBusLive(gridLost())).toBe(false)
    })
  })

  describe("the Safety bus", () => {
    test("is live through Vital→Safety from a live Vital bus", () => {
      expect(isSafetyBusLive(base)).toBe(true)
      expect(isBatteryFeeding(base)).toBe(false)
    })
    test("is live from the battery while Vital→Safety is open and charge is left", () => {
      expect(isBatteryFeeding(onBattery())).toBe(true)
      expect(isSafetyBusLive(onBattery())).toBe(true)
      expect(isSafetyBusLive(onBattery({ upsCharge: 0 }))).toBe(false)
    })
    test("a live Vital bus with Vital→Safety open and a flat battery leaves it dead", () => {
      expect(isSafetyBusLive({ ...base, safetyFeedBreaker: false, upsCharge: 0 })).toBe(false)
    })
  })

  describe("the automatic changeover", () => {
    test("settling a healthy chain changes nothing", () => {
      expect(settleEmergencyChain(base)).toBe(base)
    })
    test("a dead Auxiliary bus opens Aux→Vital, and Vital→Safety with it, in the same tick", () => {
      const settled: PowerPlantState = settleEmergencyChain(gridLost())
      expect(settled.vitalFeedBreaker).toBe(false)
      expect(settled.safetyFeedBreaker).toBe(false)
    })
    test("a tick on a lost grid opens both and the Safety bus stays live (no gap)", () => {
      const ticked: PowerPlantState = PowerPlantTick(gridLost())
      expect(ticked.vitalFeedBreaker).toBe(false)
      expect(ticked.safetyFeedBreaker).toBe(false)
      expect(isVitalBusLive(ticked)).toBe(false)
      expect(isSafetyBusLive(ticked)).toBe(true)
    })
    test("a dead Vital bus with only Aux→Vital open opens Vital→Safety", () => {
      expect(settleEmergencyChain({ ...base, vitalFeedBreaker: false }).safetyFeedBreaker).toBe(false)
    })
    test("a tick never closes a breaker: the grid back leaves both open", () => {
      const ticked: PowerPlantState = PowerPlantTick(gridBack())
      expect(ticked.vitalFeedBreaker).toBe(false)
      expect(ticked.safetyFeedBreaker).toBe(false)
    })
  })

  describe("the hand-back", () => {
    test("Aux→Vital closes by the operator on a live Auxiliary bus with control power", () => {
      const closed: PowerPlantState = powerPlantReducer(gridBack({ upsCharge: 50 }), { type: "CLOSE_VITAL_FEED_BREAKER" })
      expect(closed.vitalFeedBreaker).toBe(true)
      expect(isVitalBusLive(closed)).toBe(true)
    })
    test("Aux→Vital does not close on a dead Auxiliary bus", () => {
      const dead: PowerPlantState = onBattery()
      expect(powerPlantReducer(dead, { type: "CLOSE_VITAL_FEED_BREAKER" })).toBe(dead)
    })
    test("Aux→Vital needs control power: a flat battery on a dead Safety bus refuses it", () => {
      const noPower: PowerPlantState = gridBack({ upsCharge: 0 })
      expect(isSafetyBusLive(noPower)).toBe(false)
      expect(powerPlantReducer(noPower, { type: "CLOSE_VITAL_FEED_BREAKER" })).toBe(noPower)
    })
    test("the operator can open Aux→Vital by hand, and Vital→Safety follows", () => {
      const opened: PowerPlantState = powerPlantReducer(base, { type: "OPEN_VITAL_FEED_BREAKER" })
      expect(opened.vitalFeedBreaker).toBe(false)
      expect(opened.safetyFeedBreaker).toBe(false)
      expect(isSafetyBusLive(opened)).toBe(true)
    })
    test("opening Aux→Vital needs control power", () => {
      const noPower: PowerPlantState = { ...base, safetyFeedBreaker: false, upsCharge: 0 }
      expect(powerPlantReducer(noPower, { type: "OPEN_VITAL_FEED_BREAKER" })).toBe(noPower)
    })
    test("Vital→Safety closes by the operator on a live Vital bus, with no control power", () => {
      const flat: PowerPlantState = { ...base, safetyFeedBreaker: false, upsCharge: 0 }
      expect(isSafetyBusLive(flat)).toBe(false)
      const closed: PowerPlantState = powerPlantReducer(flat, { type: "CLOSE_SAFETY_FEED_BREAKER" })
      expect(closed.safetyFeedBreaker).toBe(true)
      expect(isSafetyBusLive(closed)).toBe(true)
    })
    test("Vital→Safety does not close on a dead Vital bus", () => {
      const dead: PowerPlantState = gridBack()
      expect(powerPlantReducer(dead, { type: "CLOSE_SAFETY_FEED_BREAKER" })).toBe(dead)
    })
    test("Vital→Safety opens by hand and the battery takes over", () => {
      const opened: PowerPlantState = powerPlantReducer(base, { type: "OPEN_SAFETY_FEED_BREAKER" })
      expect(isBatteryFeeding(opened)).toBe(true)
    })
  })

  describe("the UPS charge", () => {
    test("drains at 100% per nominal runtime while the battery feeds", () => {
      expect(upsChargeAfter(onBattery())).toBeCloseTo(100 - perTick(CstUps.NominalRuntime), 10)
    })
    test("drains also with the Vital bus back and Vital→Safety still open", () => {
      const forgotten: PowerPlantState = { ...base, safetyFeedBreaker: false }
      expect(upsChargeAfter(forgotten)).toBeCloseTo(100 - perTick(CstUps.NominalRuntime), 10)
    })
    test("recharges at the fixed rate only with Vital→Safety closed on a live Vital bus, and stops at 100", () => {
      expect(upsChargeAfter({ ...base, upsCharge: 50 })).toBeCloseTo(50 + perTick(CstUps.RechargeTime), 10)
      expect(upsChargeAfter(base)).toBe(100)
    })
    test("does not recharge with Vital→Safety open and the Vital bus back", () => {
      expect(upsChargeAfter({ ...base, safetyFeedBreaker: false, upsCharge: 50 })).toBeLessThan(50)
    })
    test("a tick moves the charge", () => {
      expect(PowerPlantTick(gridLost()).upsCharge).toBeLessThan(100)
    })
  })

  describe("0% on a dead Vital bus ends the simulation", () => {
    test("the tick that reaches 0 sets simulationEnded and later ticks change nothing", () => {
      const last: PowerPlantState = onBattery({ upsCharge: perTick(CstUps.NominalRuntime) })
      const ended: PowerPlantState = PowerPlantTick(last)
      expect(ended.upsCharge).toBe(0)
      expect(ended.simulationEnded).toBe(true)
      expect(PowerPlantTick(ended)).toBe(ended)
    })
    test("a batch stops on the ending tick", () => {
      const { ticksRun, state } = runTicks(onBattery({ upsCharge: 2 * perTick(CstUps.NominalRuntime) }), 50)
      expect(ticksRun).toBe(2)
      expect(state.simulationEnded).toBe(true)
    })
    test("with the Vital bus live a flat battery never ends the simulation; the Safety bus is dead and Vital→Safety is the way out", () => {
      const flat: PowerPlantState = PowerPlantTick({ ...base, safetyFeedBreaker: false, upsCharge: 0 })
      expect(flat.simulationEnded).toBe(false)
      expect(isSafetyBusLive(flat)).toBe(false)
      expect(powerPlantReducer(flat, { type: "CLOSE_SAFETY_FEED_BREAKER" }).safetyFeedBreaker).toBe(true)
    })
  })

  describe("breaker commands need the Safety bus", () => {
    const noPower: PowerPlantState = { ...base, safetyFeedBreaker: false, upsCharge: 0 }
    test("grid supply close", () => {
      const dead: PowerPlantState = { ...noPower, gridSupplyBreaker: false }
      expect(powerPlantReducer(dead, { type: "CLOSE_GRID_SUPPLY_BREAKER" })).toBe(dead)
    })
    test("with the Safety bus live the breakers work", () => {
      expect(powerPlantReducer(base, { type: "OPEN_GRID_SUPPLY_BREAKER" }).gridSupplyBreaker).toBe(false)
    })
    test("generator breaker toggle", () => {
      const syncing: PowerPlantState = { ...noPower, Turbine: { ...noPower.Turbine, rpm: CstSimulation.CstTurbine.SyncRPM } }
      expect(powerPlantReducer(syncing, { type: "TOGGLE_GENERATOR_BREAKER" })).toBe(syncing)
      const live: PowerPlantState = { ...syncing, safetyFeedBreaker: true }
      expect(powerPlantReducer(live, { type: "TOGGLE_GENERATOR_BREAKER" }).Turbine.generatorBreaker).toBe(true)
    })
    test("generator breaker closes inside the sync window with the Auxiliary bus live", () => {
      const fed: PowerPlantState = { ...base, Turbine: { ...base.Turbine, generatorBreaker: false, rpm: CstSimulation.CstTurbine.SyncRPM + 1 } }
      expect(isBusLive(fed)).toBe(true)
      expect(powerPlantReducer(fed, { type: "TOGGLE_GENERATOR_BREAKER" }).Turbine.generatorBreaker).toBe(true)
    })
    test("trip reset", () => {
      const tripped: PowerPlantState = { ...noPower, Boiler: { ...noPower.Boiler, burnerTripped: true } }
      expect(powerPlantReducer(tripped, { type: "RESET_TRIP", payload: { trip: "burner" } })).toBe(tripped)
      expect(powerPlantReducer({ ...tripped, safetyFeedBreaker: true }, { type: "RESET_TRIP", payload: { trip: "burner" } }).Boiler.burnerTripped).toBe(false)
    })
  })

  describe("local mechanical trip (#184)", () => {
    const carrying: PowerPlantState = {
      ...base,
      Turbine: { ...base.Turbine, generatorBreaker: true, electricOutput: 30, loadSetpoint: 30, speedMode: "synchronised" },
    }
    test("opens the generator breaker; load and setpoint 0, speed mode Free", () => {
      const { Turbine } = powerPlantReducer(carrying, { type: "LOCAL_TRIP_GENERATOR_BREAKER" })
      expect(Turbine.generatorBreaker).toBe(false)
      expect(Turbine.electricOutput).toBe(0)
      expect(Turbine.loadSetpoint).toBe(0)
      expect(Turbine.speedMode).toBe("free")
    })
    test("opens the grid supply breaker", () => {
      expect(powerPlantReducer(carrying, { type: "LOCAL_TRIP_GRID_SUPPLY_BREAKER" }).gridSupplyBreaker).toBe(false)
    })
    test("with the Safety bus live the trips open like the normal open", () => {
      expect(powerPlantReducer(carrying, { type: "LOCAL_TRIP_GRID_SUPPLY_BREAKER" })).toEqual(powerPlantReducer(carrying, { type: "OPEN_GRID_SUPPLY_BREAKER" }))
      expect(powerPlantReducer(carrying, { type: "LOCAL_TRIP_GENERATOR_BREAKER" })).toEqual(powerPlantReducer(carrying, { type: "TOGGLE_GENERATOR_BREAKER" }))
    })
    test("a trip of an open breaker changes nothing", () => {
      const open: PowerPlantState = { ...base, gridSupplyBreaker: false, Turbine: { ...base.Turbine, generatorBreaker: false } }
      expect(powerPlantReducer(open, { type: "LOCAL_TRIP_GENERATOR_BREAKER" })).toBe(open)
      expect(powerPlantReducer(open, { type: "LOCAL_TRIP_GRID_SUPPLY_BREAKER" })).toBe(open)
    })
  })

  describe("the controller controls need the Vital bus", () => {
    const deadVital: PowerPlantState = { ...base, vitalFeedBreaker: false, Turbine: { ...base.Turbine, generatorBreaker: false, rpm: 1000 } }
    test("speed mode and run-up point freeze, also with the Auxiliary bus live", () => {
      expect(powerPlantReducer(deadVital, { type: "SET_SPEED_MODE", payload: { speedMode: "rampUp" } })).toBe(deadVital)
      expect(powerPlantReducer(deadVital, { type: "SELECT_RUN_UP_POINT", payload: { runUpPoint: 1500 } })).toBe(deadVital)
    })
  })

  test("the pump and valve knobs need no control power", () => {
    const noPower: PowerPlantState = { ...base, safetyFeedBreaker: false, upsCharge: 0 }
    expect(powerPlantReducer(noPower, { type: "SET_OIL_PUMP", payload: { pumpRunning: true } }).Oil.pumpRunning).toBe(true)
  })
})
