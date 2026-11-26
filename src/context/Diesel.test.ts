import { describe, expect, test } from "vitest"
import { CstAuxiliary, CstDiesel, CstSimulation } from "./const"
import { isBusLive } from "./AuxiliaryBus"
import { auxiliaryLoadOf } from "./AuxiliaryLoad"
import { dieselBreakerCloseRefusal, dieselOutput } from "./Diesel"
import { makeInitialState, powerPlantReducer } from "./PowerPlantReducer"
import PowerPlantState from "./PowerPlantState"
import PowerPlantTick from "./PowerPlantTick"

const cold: PowerPlantState = makeInitialState()
const dead: PowerPlantState = { ...cold, gridSupplyBreaker: false }
const running: PowerPlantState = { ...dead, Diesel: { status: "running", startElapsed: 0 } }
const ticksOfStart: number = Math.round(CstDiesel.StartTime / CstSimulation.DeltaTime)
const SyncRPM: number = CstSimulation.CstTurbine.SyncRPM
const act = powerPlantReducer

describe("the onsite diesel (#169)", () => {
  test("a new plant has the diesel stopped and its breaker open", () => {
    expect(cold.Diesel.status).toBe("stopped")
    expect(cold.dieselBreaker).toBe(false)
  })

  test("RUN starts it, it runs after the start time, with no plant bus", () => {
    let state: PowerPlantState = act(dead, { type: "SET_DIESEL_RUN", payload: { run: true } })
    expect(state.Diesel.status).toBe("starting")
    for (let i = 0; i < ticksOfStart - 1; i++) state = PowerPlantTick(state)
    expect(state.Diesel.status).toBe("starting")
    state = PowerPlantTick(state)
    expect(state.Diesel.status).toBe("running")
  })

  describe("closing the breaker", () => {
    test("is refused with a reason while stopped or starting, allowed once running onto a dead bus", () => {
      const starting: PowerPlantState = act(dead, { type: "SET_DIESEL_RUN", payload: { run: true } })
      expect(dieselBreakerCloseRefusal(dead)).toBeTypeOf("string")
      expect(dieselBreakerCloseRefusal(starting)).toBeTypeOf("string")
      expect(act(starting, { type: "CLOSE_DIESEL_BREAKER" }).dieselBreaker).toBe(false)
      expect(dieselBreakerCloseRefusal(running)).toBeUndefined()
      expect(isBusLive(act(running, { type: "CLOSE_DIESEL_BREAKER" }))).toBe(true)
    })

    test("onto a bus fed by the unit aux breaker alone needs the ±2 rpm window; onto a grid-fed bus it is free", () => {
      const gen = (rpm: number, gridSupplyBreaker: boolean): PowerPlantState => ({
        ...running,
        gridSupplyBreaker,
        Turbine: { ...running.Turbine, unitAuxBreaker: true, rpm },
      })
      expect(dieselBreakerCloseRefusal(gen(SyncRPM + 3, false))).toBeTypeOf("string")
      expect(dieselBreakerCloseRefusal(gen(SyncRPM + 1, false))).toBeUndefined()
      expect(dieselBreakerCloseRefusal(gen(SyncRPM + 30, true))).toBeUndefined()
    })

    test("needs the safety bus; the local trip does not", () => {
      const noControl: PowerPlantState = { ...running, upsBreaker: false }
      expect(isBusLive(noControl)).toBe(false)
      expect(act(noControl, { type: "CLOSE_DIESEL_BREAKER" }).dieselBreaker).toBe(false)
      const closed: PowerPlantState = { ...noControl, dieselBreaker: true }
      expect(act(closed, { type: "LOCAL_TRIP_DIESEL_BREAKER" }).dieselBreaker).toBe(false)
    })
  })

  test("STOP with the breaker closed opens it on that tick and leaves a dead bus", () => {
    const stopped: PowerPlantState = act({ ...running, dieselBreaker: true }, { type: "SET_DIESEL_RUN", payload: { run: false } })
    expect(stopped.dieselBreaker).toBe(false)
    expect(stopped.Diesel.status).toBe("stopped")
    expect(isBusLive(stopped)).toBe(false)
  })

  describe("overload", () => {
    const pumpsAbove = (base: PowerPlantState): PowerPlantState => ({
      ...base,
      Deaerator: { ...base.Deaerator, feedPumpValvePosition: (CstDiesel.RatedPower + 0.5) / CstAuxiliary.FeedPump },
    })

    test("as the sole supply, a load above the rating opens the breaker on that tick, the diesel keeps running, a reclose opens again", () => {
      const overloaded: PowerPlantState = PowerPlantTick(pumpsAbove({ ...running, dieselBreaker: true }))
      expect(overloaded.dieselBreaker).toBe(false)
      expect(overloaded.Diesel.status).toBe("running")
      expect(overloaded.auxiliaryLoad).toBe(0)
      expect(PowerPlantTick(act(overloaded, { type: "CLOSE_DIESEL_BREAKER" })).dieselBreaker).toBe(false)
    })

    test("a load within the rating keeps it closed", () => {
      expect(PowerPlantTick({ ...running, dieselBreaker: true }).dieselBreaker).toBe(true)
    })

    test("paralleled with the grid supply it carries no load and never opens", () => {
      expect(PowerPlantTick(pumpsAbove({ ...running, gridSupplyBreaker: true, dieselBreaker: true })).dieselBreaker).toBe(true)
    })
  })

  test("the grid supply closing onto a dead bus resumes the pumps at their set positions", () => {
    const asked: PowerPlantState = { ...dead, Condenser: { ...dead.Condenser, recirculationPumpValvePosition: 1 } }
    expect(PowerPlantTick(asked).auxiliaryLoad).toBe(0)
    expect(PowerPlantTick(act(asked, { type: "CLOSE_GRID_SUPPLY_BREAKER" })).auxiliaryLoad).toBeGreaterThan(0)
  })
})

describe("dieselOutput (#175)", () => {
  const loaded: PowerPlantState = { ...running, dieselBreaker: true, Oil: { ...running.Oil, pumpRunning: true } }

  test("is the auxiliary load while the diesel is the sole supply", () => {
    expect(dieselOutput(loaded)).toBe(auxiliaryLoadOf(loaded))
    expect(dieselOutput(loaded)).toBeGreaterThan(0)
  })

  test("is 0 with the breaker open, the grid closed or the unit aux breaker closed", () => {
    expect(dieselOutput({ ...loaded, dieselBreaker: false })).toBe(0)
    expect(dieselOutput({ ...loaded, gridSupplyBreaker: true })).toBe(0)
    expect(dieselOutput({ ...loaded, Turbine: { ...loaded.Turbine, unitAuxBreaker: true } })).toBe(0)
  })
})
