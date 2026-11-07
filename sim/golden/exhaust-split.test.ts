import { describe, expect, test } from "vitest"
import { finalState, Scenario } from "../scenario"
import { loadSnapshot } from "../snapshot"
import PowerPlantState from "../../src/context/PowerPlantState"
import { CstSimulation } from "../../src/context/const"

// Goal check of #81: from the settled bypass loop, the same 25% through the bypass or through the turbine valve.
// With the rotor at sync speed the shaft takes its full work and the exhaust is about a third moisture, so the two must
// no longer give the same condenser (ADR 0028). At standstill the shaft takes none and the exhaust is like bypass steam
// (ADR 0032), so the rotor is set to sync speed here; the 3 s run is short enough for it to stay near it.
const settled: PowerPlantState = loadSnapshot("bypass-loop")
const { SyncRPM } = CstSimulation.CstTurbine

const after3s = (bypassValvePosition: number, turbineValvePosition: number, rpm: number): PowerPlantState => {
  const scenario: Scenario = {
    name: "exhaust-split",
    description: "Same flow through the bypass or the turbine valve",
    duration: 3,
    sampleEvery: 1,
    initial: { ...settled, Turbine: { ...settled.Turbine, bypassValvePosition, turbineValvePosition, rpm } },
    actions: [],
  }
  return finalState(scenario)
}

describe("exhaust split", () => {
  const onBypass: PowerPlantState = after3s(0.25, 0, SyncRPM)
  const onTurbine: PowerPlantState = after3s(0, 0.25, SyncRPM)
  const atStandstill: PowerPlantState = after3s(0, 0.25, 0)

  test("both paths bring the same steam flow to the condenser, the turbine's less what the heater takes (ADR 0031)", () => {
    expect(onBypass.Heater.extractionFlow).toBe(0)
    expect(onTurbine.Heater.extractionFlow).toBeGreaterThan(0)
    expect(onTurbine.Condenser.intakeFlowRate + onTurbine.Heater.extractionFlow).toBeCloseTo(
      onBypass.Condenser.intakeFlowRate,
      0,
    )
  })

  test("turbine exhaust leaves less steam in the pool than bypass steam", () => {
    expect(onTurbine.Condenser.steamMass).toBeLessThan(onBypass.Condenser.steamMass)
  })

  test("with its moisture counted, more enters the hotwell from the exhaust than from the bypass", () => {
    expect(onTurbine.Condenser.condensationRate).toBeGreaterThan(onBypass.Condenser.condensationRate)
  })

  test("at standstill the exhaust carries almost no moisture: the pool holds more than at sync speed", () => {
    expect(atStandstill.Condenser.steamMass).toBeGreaterThan(onTurbine.Condenser.steamMass)
  })
})
