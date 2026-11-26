import { describe, expect, test } from "vitest"
import { CstAuxiliary, CstOil } from "./const"
import { auxiliaryLoadOf, consumerDraws, netOutputOf } from "./AuxiliaryLoad"
import { makeInitialState } from "./PowerPlantReducer"
import PowerPlantState from "./PowerPlantState"
import PowerPlantTick from "./PowerPlantTick"

const idle: PowerPlantState = makeInitialState()
const withDeaerator = (patch: Partial<PowerPlantState["Deaerator"]>): PowerPlantState => ({ ...idle, Deaerator: { ...idle.Deaerator, ...patch } })
const withCondenser = (patch: Partial<PowerPlantState["Condenser"]>): PowerPlantState => ({ ...idle, Condenser: { ...idle.Condenser, ...patch } })

describe("auxiliary load (#140)", () => {
  test("a cold plant with every pump off draws nothing", () => {
    expect(auxiliaryLoadOf(idle)).toBe(0)
  })

  test("the feed pump draws its rated power in proportion to the valve position", () => {
    expect(auxiliaryLoadOf(withDeaerator({ feedPumpValvePosition: 1 }))).toBeCloseTo(CstAuxiliary.FeedPump)
    expect(auxiliaryLoadOf(withDeaerator({ feedPumpValvePosition: 0.5 }))).toBeCloseTo(CstAuxiliary.FeedPump / 2)
  })

  test("a tripped feed pump draws nothing whatever the valve position", () => {
    expect(auxiliaryLoadOf(withDeaerator({ feedPumpValvePosition: 1, feedPumpTripped: true }))).toBe(0)
  })

  test("the condensation pump follows its valve and draws nothing when tripped", () => {
    expect(auxiliaryLoadOf(withCondenser({ condensationPumpValvePosition: 0.25 }))).toBeCloseTo(CstAuxiliary.CondensationPump / 4)
    expect(auxiliaryLoadOf(withCondenser({ condensationPumpValvePosition: 1, condensationPumpTripped: true }))).toBe(0)
  })

  test("the recirculation pump follows its valve", () => {
    expect(auxiliaryLoadOf(withCondenser({ recirculationPumpValvePosition: 1 }))).toBeCloseTo(CstAuxiliary.RecirculationPump)
  })

  test("the air extraction pump draws its rated power while enabled and not tripped", () => {
    expect(auxiliaryLoadOf(withCondenser({ isAirExtractionPumpEnabled: true }))).toBeCloseTo(CstAuxiliary.AirExtractionPump)
    expect(auxiliaryLoadOf(withCondenser({ isAirExtractionPumpEnabled: true, airPumpTripped: true }))).toBe(0)
  })

  test("the oil pump and the turning gear motor draw their rated power while on", () => {
    expect(auxiliaryLoadOf({ ...idle, Oil: { ...idle.Oil, pumpRunning: true } })).toBeCloseTo(CstAuxiliary.LubeOilPump)
    expect(auxiliaryLoadOf({ ...idle, Turbine: { ...idle.Turbine, turningGearEngaged: true } })).toBeCloseTo(CstAuxiliary.TurningGearMotor)
  })

  test("the turning gear motor stops when the gear throws out on the roll-off", () => {
    const engaged: PowerPlantState = { ...idle, Oil: { pumpRunning: true, headerPressure: CstOil.NominalPressure }, Turbine: { ...idle.Turbine, turningGearEngaged: true, rpm: 3 } }
    expect(PowerPlantTick(engaged).auxiliaryLoad).toBeCloseTo(CstAuxiliary.TurningGearMotor + CstAuxiliary.LubeOilPump)
    const rolling: PowerPlantState = { ...engaged, Turbine: { ...engaged.Turbine, rpm: 500 } }
    expect(PowerPlantTick(rolling).auxiliaryLoad).toBeCloseTo(CstAuxiliary.LubeOilPump)
  })

  test("all six at full draw about 5% of the rated output", () => {
    const all: PowerPlantState = {
      ...idle,
      Deaerator: { ...idle.Deaerator, feedPumpValvePosition: 1 },
      Condenser: { ...idle.Condenser, condensationPumpValvePosition: 1, recirculationPumpValvePosition: 1, isAirExtractionPumpEnabled: true },
      Oil: { ...idle.Oil, pumpRunning: true },
      Turbine: { ...idle.Turbine, turningGearEngaged: true },
    }
    expect(auxiliaryLoadOf(all) / 133.7).toBeGreaterThan(0.04)
    expect(auxiliaryLoadOf(all) / 133.7).toBeLessThan(0.06)
  })

  test("net output is the electric output less the auxiliary load, negative with the breaker open", () => {
    const state: PowerPlantState = { ...idle, auxiliaryLoad: 5, Turbine: { ...idle.Turbine, electricOutput: 100 } }
    expect(netOutputOf(state)).toBe(95)
    expect(netOutputOf({ ...state, Turbine: { ...state.Turbine, electricOutput: 0 } })).toBe(-5)
  })

  test("the tick writes the load of the new state, after a trip", () => {
    const ticked: PowerPlantState = PowerPlantTick({ ...idle, Oil: { ...idle.Oil, pumpRunning: true } })
    expect(ticked.auxiliaryLoad).toBeCloseTo(CstAuxiliary.LubeOilPump)
  })
})

describe("consumer draws (#171)", () => {
  const busy: PowerPlantState = {
    ...idle,
    Deaerator: { ...idle.Deaerator, feedPumpValvePosition: 0.5 },
    Condenser: { ...idle.Condenser, condensationPumpValvePosition: 1, recirculationPumpValvePosition: 0.4, isAirExtractionPumpEnabled: true },
    Oil: { ...idle.Oil, pumpRunning: true },
    Turbine: { ...idle.Turbine, turningGearEngaged: true },
  }

  test("lists the six consumers largest rated first", () => {
    expect(consumerDraws(busy)).toEqual([
      CstAuxiliary.FeedPump * 0.5,
      CstAuxiliary.RecirculationPump * 0.4,
      CstAuxiliary.CondensationPump,
      CstAuxiliary.AirExtractionPump,
      CstAuxiliary.LubeOilPump,
      CstAuxiliary.TurningGearMotor,
    ])
  })

  test("their sum is the auxiliary load", () => {
    expect(consumerDraws(busy).reduce((a: number, b: number) => a + b, 0)).toBeCloseTo(auxiliaryLoadOf(busy))
  })

  test("all draw 0 on a dead bus", () => {
    expect(consumerDraws({ ...busy, gridSupplyBreaker: false, dieselBreaker: false, Turbine: { ...busy.Turbine, generatorBreaker: false } })).toEqual([0, 0, 0, 0, 0, 0])
  })
})
