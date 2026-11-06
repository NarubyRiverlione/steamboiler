import { describe, expect, test } from "vitest"
import { finalState, Scenario } from "../scenario"
import { loadSnapshot } from "../snapshot"
import PowerPlantState from "../../src/context/PowerPlantState"

// Goal check of #81: from the settled bypass loop, the same 25% (50 kg/s) through the bypass or through the turbine.
// The exhaust is about a third moisture, so the two must no longer give the same condenser (ADR 0026).
const settled: PowerPlantState = loadSnapshot("bypass-loop")

const after120s = (bypassValvePosition: number, turbineValvePosition: number): PowerPlantState => {
  const scenario: Scenario = {
    name: "exhaust-split",
    description: "Same flow through the bypass or the turbine valve",
    duration: 120,
    sampleEvery: 1,
    initial: { ...settled, Turbine: { ...settled.Turbine, bypassValvePosition, turbineValvePosition } },
    actions: [],
  }
  return finalState(scenario)
}

describe("exhaust split", () => {
  const onBypass: PowerPlantState = after120s(0.25, 0)
  const onTurbine: PowerPlantState = after120s(0, 0.25)

  test("both paths bring the same steam flow to the condenser", () => {
    expect(onTurbine.Condenser.intakeFlowRate).toBeCloseTo(50, 9)
    expect(onBypass.Condenser.intakeFlowRate).toBeCloseTo(50, 9)
  })

  test("turbine exhaust leaves less steam in the pool than bypass steam", () => {
    expect(onTurbine.Condenser.steamMass).toBeLessThan(onBypass.Condenser.steamMass)
  })

  test("with its moisture counted, more enters the hotwell from the exhaust than from the bypass", () => {
    expect(onTurbine.Condenser.condensationRate).toBeGreaterThan(onBypass.Condenser.condensationRate + 15)
  })
})
