import { describe, expect, test } from "vitest"
import { gasRateOf } from "../../src/context/Boiler/BoilerTick"
import { makeInitialState } from "../../src/context/PowerPlantReducer"
import { CstSimulation } from "../../src/context/const"
import { gasCommandFor, rampGas, setGasCommand, steerGas } from "./gas"

const { GasRateMax, MaxGasFlow } = CstSimulation.CstBoiler
const { DeltaTime } = CstSimulation
const boiler = (gasFlow: number, gasRateCommand = 0) => ({
  ...makeInitialState().Boiler,
  gasFlow,
  gasRateCommand,
})
const commandOf = (actions: ReturnType<typeof steerGas>): number => {
  const [action] = actions
  if (action.type !== "SET_GAS_RATE") throw new Error("not a gas rate action")
  return action.payload.gasRateCommand
}

describe("gasCommandFor", () => {
  test("is the inverse of the taper, and 0 for no rate", () => {
    for (const rate of [-GasRateMax, -20, 20, 150, GasRateMax])
      expect(gasRateOf(gasCommandFor(rate))).toBeCloseTo(rate, 6)
    expect(gasCommandFor(0)).toBe(0)
  })

  test("stops at full deflection for a rate beyond what the knob gives", () => {
    expect(gasCommandFor(10 * GasRateMax)).toBe(1)
  })
})

describe("steerGas", () => {
  test("turns the knob so the gas reaches the target in the given time", () => {
    expect(gasRateOf(commandOf(steerGas(boiler(1000), 1020, 1)))).toBeCloseTo(20, 6)
    expect(gasRateOf(commandOf(steerGas(boiler(1000), 980, 2)))).toBeCloseTo(-10, 6)
  })

  test("never asks for more than full deflection", () => {
    expect(commandOf(steerGas(boiler(0), 5000, 1))).toBe(1)
  })

  test("goes fully down to 0 and fully up to the maximum, so the clamp hits them exactly", () => {
    expect(commandOf(steerGas(boiler(100), 0, 1))).toBe(-1)
    expect(commandOf(steerGas(boiler(MaxGasFlow - 5), MaxGasFlow + 100, 1))).toBe(1)
  })

  test("targets beyond the travel are clamped to it", () => {
    expect(steerGas(boiler(MaxGasFlow), MaxGasFlow + 500, 1)).toEqual([])
  })

  test("does nothing when the knob is already right, and centres it at the target", () => {
    expect(steerGas(boiler(500, 0), 500, 1)).toEqual([])
    expect(steerGas(boiler(0, -1), 0, 1)).toEqual([setGasCommand(0)])
    expect(steerGas(boiler(0, 1), 5000, 1)).toEqual([])
  })
})

describe("rampGas", () => {
  test("is nothing when the gas is already there", () => {
    expect(rampGas(0, 500, 500)).toEqual([])
  })

  test("full deflection for whole ticks, the remainder in one tick, then centred", () => {
    const actions = rampGas(5, 0, 2000)
    const ticks = Math.floor(2000 / (GasRateMax * DeltaTime))
    expect(actions).toHaveLength(3)
    expect(actions[0]).toEqual({ at: 5, action: setGasCommand(1) })
    expect(actions[1].at).toBeCloseTo(5 + ticks * DeltaTime, 9)
    expect(actions[2]).toEqual({ at: actions[1].at + DeltaTime, action: setGasCommand(0) })
    const remainder = 2000 - ticks * GasRateMax * DeltaTime
    const middle = actions[1].action
    if (middle.type !== "SET_GAS_RATE") throw new Error("not a gas rate action")
    expect(gasRateOf(middle.payload.gasRateCommand) * DeltaTime).toBeCloseTo(remainder, 6)
  })

  test("goes down with the knob to the left, and has no remainder tick for a whole number of ticks", () => {
    const actions = rampGas(0, 3000, 0)
    expect(actions).toHaveLength(2)
    expect(actions[0]).toEqual({ at: 0, action: setGasCommand(-1) })
    expect(actions[1].at).toBeCloseTo(10, 6)
    expect(actions[1].action).toEqual(setGasCommand(0))
  })
})
