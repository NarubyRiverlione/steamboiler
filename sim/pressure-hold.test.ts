import { gasRateOf } from "../src/context/Boiler/BoilerTick"
import { describe, expect, test } from "vitest"
import { makeInitialState } from "../src/context/PowerPlantReducer"
import PowerPlantAction from "../src/context/PowerPlantActions"
import PowerPlantState from "../src/context/PowerPlantState"
import { holdPressureWithGas, PressureHoldSettings as P } from "./scenarios/pressure-hold"
import { StartGas } from "./scenarios/steps"

// The gas pressure hold shared by the bypass-loop and turbine-runup operators

const cold = makeInitialState()
const boiler = (pressure: number, gasFlow: number, heatingRate = 0): PowerPlantState => ({
  ...cold,
  Boiler: { ...cold.Boiler, pressure, gasFlow, heatingRate },
})
const gasChange = (actions: PowerPlantAction[]): number => {
  const [action] = actions
  if (actions.length === 0) return 0
  // The knob command turns into the gas change over the adjustment interval
  if (action.type === "SET_GAS_RATE") return gasRateOf(action.payload.gasRateCommand) * P.AdjustEvery
  throw new Error(`unexpected action ${action.type}`)
}

describe("holdPressureWithGas", () => {
  test("a given ceiling replaces the heat-up gas as the limit", () => {
    expect(
      gasChange(holdPressureWithGas(boiler(P.Target - P.Band - 1, StartGas), P.LoadGasCeiling)),
    ).toBeCloseTo(P.GasStep, 6)
  })

  test("lowers gas above the band", () => {
    expect(gasChange(holdPressureWithGas(boiler(P.Target + P.Band + 1, StartGas)))).toBeCloseTo(-P.GasStep, 6)
  })

  test("raises gas below the band", () => {
    expect(gasChange(holdPressureWithGas(boiler(P.Target - P.Band - 1, 500)))).toBeCloseTo(P.GasStep, 6)
  })

  test("never raises gas above StartGas, which is the build-phase no-op", () => {
    expect(holdPressureWithGas(boiler(P.Target - P.Band - 1, StartGas))).toEqual([])
    expect(gasChange(holdPressureWithGas(boiler(P.Target - P.Band - 1, StartGas - 1)))).toBeCloseTo(1, 6)
  })

  test("never lowers gas below the burner's minimum firing rate", () => {
    expect(gasChange(holdPressureWithGas(boiler(P.Target + P.Band + 1, P.GasFloor + 3)))).toBeCloseTo(-3, 6)
    expect(holdPressureWithGas(boiler(P.Target + P.Band + 1, P.GasFloor))).toEqual([])
  })

  test("inside the band leans against the pressure trend", () => {
    expect(gasChange(holdPressureWithGas(boiler(P.Target + 1, 500, 0.01)))).toBeCloseTo(-P.GasStep, 6)
    expect(gasChange(holdPressureWithGas(boiler(P.Target - 1, 500, -0.01)))).toBeCloseTo(P.GasStep, 6)
    expect(holdPressureWithGas(boiler(P.Target + 1, 500, -0.01))).toEqual([])
    expect(holdPressureWithGas(boiler(P.Target - 1, 500, 0.01))).toEqual([])
  })
})
