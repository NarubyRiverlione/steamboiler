import { describe, expect, test } from "vitest"
import { CstDiesel, CstOil, CstSimulation } from "./const"
import { isBusLive, isHouseLoad } from "./AuxiliaryBus"
import { auxiliaryLoadOf, netOutputOf } from "./AuxiliaryLoad"
import { makeInitialState, powerPlantReducer } from "./PowerPlantReducer"
import PowerPlantAction from "./PowerPlantActions"
import PowerPlantState from "./PowerPlantState"
import PowerPlantTick from "./PowerPlantTick"

const { SyncRPM, BreakerRPMMargin } = CstSimulation.CstTurbine

// Top of the ±2 rpm window: the cold plant has no steam, so one tick of load does not yet sag the unit out of it
const HighInWindow: number = SyncRPM + 1.5

// A plant at sync speed with the pumps asked for and the oil header built; the supplies as given
const plant = (supplies: { grid: boolean; unitAux: boolean; generator: boolean }, rpm: number = SyncRPM): PowerPlantState => {
  const cold: PowerPlantState = makeInitialState()
  return {
    ...cold,
    gridSupplyBreaker: supplies.grid,
    Deaerator: { ...cold.Deaerator, feedPumpValvePosition: 0.5 },
    Condenser: { ...cold.Condenser, condensationPumpValvePosition: 0.5, recirculationPumpValvePosition: 0.5, isAirExtractionPumpEnabled: true },
    Oil: { pumpRunning: true, headerPressure: CstOil.NominalPressure },
    Turbine: { ...cold.Turbine, rpm, unitAuxBreaker: supplies.unitAux, generatorBreaker: supplies.generator, turningGearEngaged: true },
  }
}
const reduce = (action: PowerPlantAction, state: PowerPlantState): PowerPlantState => powerPlantReducer(state, action)

describe("the unit aux breaker (#189, ADR 0053)", () => {
  describe("state and bus", () => {
    test("a new plant starts with the grid supply closed and the unit aux breaker open", () => {
      const start: PowerPlantState = makeInitialState()
      expect(start.gridSupplyBreaker).toBe(true)
      expect(start.Turbine.unitAuxBreaker).toBe(false)
    })

    test("the unit aux breaker feeds the bus; the generator breaker alone does not", () => {
      expect(isBusLive(plant({ grid: false, unitAux: true, generator: false }))).toBe(true)
      expect(isBusLive(plant({ grid: false, unitAux: false, generator: true }))).toBe(false)
    })

    test("house load operation is the generator breaker open with the unit aux breaker closed", () => {
      expect(isHouseLoad(plant({ grid: false, unitAux: true, generator: false }))).toBe(true)
      expect(isHouseLoad(plant({ grid: false, unitAux: true, generator: true }))).toBe(false)
      expect(isHouseLoad(plant({ grid: true, unitAux: false, generator: false }))).toBe(false)
    })
  })

  describe("closing the unit aux breaker", () => {
    test("with the grid supply closed it opens the grid supply on the same tick (seamless transfer)", () => {
      const next: PowerPlantState = reduce({ type: "CLOSE_UNIT_AUX_BREAKER" }, plant({ grid: true, unitAux: false, generator: false }))
      expect(next.Turbine.unitAuxBreaker).toBe(true)
      expect(next.gridSupplyBreaker).toBe(false)
      expect(isBusLive(next)).toBe(true)
    })

    test("closes only inside the ±2 rpm window", () => {
      const from = (rpm: number) => reduce({ type: "CLOSE_UNIT_AUX_BREAKER" }, plant({ grid: true, unitAux: false, generator: false }, rpm)).Turbine.unitAuxBreaker
      expect(from(SyncRPM - BreakerRPMMargin)).toBe(true)
      expect(from(SyncRPM + BreakerRPMMargin)).toBe(true)
      expect(from(SyncRPM + BreakerRPMMargin + 1)).toBe(false)
      expect(from(0)).toBe(false)
    })

    test("a refused close leaves the state as it is, grid supply included", () => {
      const slow: PowerPlantState = plant({ grid: true, unitAux: false, generator: false }, 100)
      expect(reduce({ type: "CLOSE_UNIT_AUX_BREAKER" }, slow)).toBe(slow)
    })

    test("needs the safety bus: dead bus, battery breaker open, does nothing", () => {
      const dead: PowerPlantState = { ...plant({ grid: false, unitAux: false, generator: false }), upsBreaker: false }
      expect(reduce({ type: "CLOSE_UNIT_AUX_BREAKER" }, dead)).toBe(dead)
    })

    test("with the generator breaker open it enters Synchronised at sync speed (the governor carries the island)", () => {
      const next: PowerPlantState = reduce({ type: "CLOSE_UNIT_AUX_BREAKER" }, plant({ grid: true, unitAux: false, generator: false }))
      expect(next.Turbine.speedMode).toBe("synchronised")
      expect(next.Turbine.speedReference).toBe(SyncRPM)
    })
  })

  describe("closing the grid supply breaker", () => {
    test("with the unit aux breaker closed it opens the unit aux breaker on the same tick (transfer back)", () => {
      const next: PowerPlantState = reduce({ type: "CLOSE_GRID_SUPPLY_BREAKER" }, plant({ grid: false, unitAux: true, generator: false }))
      expect(next.gridSupplyBreaker).toBe(true)
      expect(next.Turbine.unitAuxBreaker).toBe(false)
      expect(isBusLive(next)).toBe(true)
    })

    test("with the generator breaker open the unloaded generator goes back to Free; with it closed the grid tie carries on", () => {
      const island: PowerPlantState = plant({ grid: false, unitAux: true, generator: false })
      expect(reduce({ type: "CLOSE_GRID_SUPPLY_BREAKER" }, { ...island, Turbine: { ...island.Turbine, speedMode: "synchronised" } }).Turbine.speedMode).toBe("free")
      const tied: PowerPlantState = plant({ grid: false, unitAux: true, generator: true })
      expect(reduce({ type: "CLOSE_GRID_SUPPLY_BREAKER" }, { ...tied, Turbine: { ...tied.Turbine, speedMode: "synchronised" } }).Turbine.speedMode).toBe("synchronised")
    })
  })

  describe("opening it", () => {
    test("opening the unit aux breaker with nothing else feeding the bus leaves it dead", () => {
      const next: PowerPlantState = reduce({ type: "OPEN_UNIT_AUX_BREAKER" }, plant({ grid: false, unitAux: true, generator: false }))
      expect(next.Turbine.unitAuxBreaker).toBe(false)
      expect(isBusLive(next)).toBe(false)
    })

    test("opening the generator breaker by hand with the unit aux closed steps to the island: the governor stays in force and the setpoint is 0", () => {
      const tied: PowerPlantState = plant({ grid: false, unitAux: true, generator: true })
      const next: PowerPlantState = reduce({ type: "TOGGLE_GENERATOR_BREAKER" }, { ...tied, Turbine: { ...tied.Turbine, speedMode: "synchronised", loadSetpoint: 20, electricOutput: 20 } })
      expect(next.Turbine.generatorBreaker).toBe(false)
      expect(next.Turbine.speedMode).toBe("synchronised")
      expect(next.Turbine.loadSetpoint).toBe(0)
    })
  })

  describe("the tick", () => {
    test("in the island the generator carries the auxiliary load as its shaft load and net output is about 0", () => {
      const island: PowerPlantState = plant({ grid: false, unitAux: true, generator: false }, HighInWindow)
      const ticked: PowerPlantState = PowerPlantTick(island)
      expect(auxiliaryLoadOf(island)).toBeGreaterThan(0)
      // The shaft load is the load of the tick's start; the meter reads the pumps after the tick
      expect(ticked.Turbine.electricOutput).toBeCloseTo(auxiliaryLoadOf(island), 6)
      expect(Math.abs(netOutputOf(ticked))).toBeLessThan(0.1)
    })

    test("with the grid supply feeding the bus and the unit aux breaker open, the open generator breaker carries nothing", () => {
      expect(PowerPlantTick(plant({ grid: true, unitAux: false, generator: false })).Turbine.electricOutput).toBe(0)
    })

    test("the unit aux breaker auto-opens when the speed leaves the window, like the generator breaker", () => {
      const out: PowerPlantState = plant({ grid: false, unitAux: true, generator: false }, SyncRPM + BreakerRPMMargin + 5)
      const ticked: PowerPlantState = PowerPlantTick(out)
      expect(ticked.Turbine.unitAuxBreaker).toBe(false)
      expect(isBusLive(ticked)).toBe(false)
    })

    test("in the island the governor is not lost: Synchronised stays while the unit aux breaker is closed", () => {
      const island: PowerPlantState = plant({ grid: false, unitAux: true, generator: false }, HighInWindow)
      expect(PowerPlantTick({ ...island, Turbine: { ...island.Turbine, speedMode: "synchronised" } }).Turbine.speedMode).toBe("synchronised")
    })
  })

  describe("the diesel breaker", () => {
    const running = (state: PowerPlantState): PowerPlantState => ({ ...state, Diesel: { status: "running", startElapsed: CstDiesel.StartTime } })

    test("closes onto a bus fed by the unit aux breaker only inside the ±2 rpm window", () => {
      const inside: PowerPlantState = running(plant({ grid: false, unitAux: true, generator: false }))
      const outside: PowerPlantState = running(plant({ grid: false, unitAux: true, generator: false }, SyncRPM + BreakerRPMMargin + 1))
      expect(reduce({ type: "CLOSE_DIESEL_BREAKER" }, inside).dieselBreaker).toBe(true)
      expect(reduce({ type: "CLOSE_DIESEL_BREAKER" }, outside).dieselBreaker).toBe(false)
    })

    test("closes onto a bus fed by the grid supply at any speed", () => {
      const grid: PowerPlantState = running(plant({ grid: true, unitAux: false, generator: false }, 0))
      expect(reduce({ type: "CLOSE_DIESEL_BREAKER" }, grid).dieselBreaker).toBe(true)
    })

    test("is the sole supply only with the grid supply and the unit aux breaker both open", () => {
      const onUnitAux: PowerPlantState = { ...running(plant({ grid: false, unitAux: true, generator: false })), dieselBreaker: true }
      expect(PowerPlantTick(onUnitAux).dieselBreaker).toBe(true)
    })
  })
})
