import { describe, expect, test } from "vitest"
import { CstSimulation, CstSuperheater } from "../src/context/const"
import PowerPlantState from "../src/context/PowerPlantState"
import PowerPlantTick from "../src/context/PowerPlantTick"
import { loopWater } from "./invariants"
import { loadSnapshot } from "./snapshot"

// The spray water of the attemperator in the plant tick (ADR 0044): taken from the feed pump discharge, added to the steam
// flows, and the loop's water still closes
const settled: PowerPlantState = loadSnapshot("turbine-sync")
const withSpray = (position: number, auto = false): PowerPlantState => ({
  ...settled,
  Boiler: { ...settled.Boiler, attemperatorAuto: auto, sprayValvePosition: position },
  Turbine: { ...settled.Turbine, bypassValvePosition: 0.1, turbineValvePosition: 0.3 },
})
const flowOut = (state: PowerPlantState): number => state.Turbine.turbineSteamFlowOut + state.Turbine.bypassSteamFlowOut

describe("PowerPlantTick spray water (ADR 0044)", () => {
  test("a shut valve injects nothing", () => {
    const next: PowerPlantState = PowerPlantTick(withSpray(0))
    expect(next.Boiler.sprayFlow).toBe(0)
  })

  test("an open valve injects its flow, at most what the feed pump delivered in the last tick", () => {
    const start: PowerPlantState = withSpray(0.2)
    const next: PowerPlantState = PowerPlantTick(start)
    const valve: number = 0.2 * CstSuperheater.SprayCapacity
    expect(next.Boiler.sprayFlow).toBeCloseTo(Math.min(valve, start.Deaerator.outflowMass / CstSimulation.DeltaTime), 9)
    expect(next.Boiler.sprayFlow).toBeGreaterThan(0)
  })

  test("the spray water is added to the steam that goes to the turbine and the bypass", () => {
    const without: PowerPlantState = PowerPlantTick(withSpray(0))
    const sprayed: PowerPlantState = PowerPlantTick(withSpray(0.2))
    expect(flowOut(sprayed) - flowOut(without)).toBeCloseTo(sprayed.Boiler.sprayFlow, 2)
  })

  test("the water in the loop is conserved with the spray running", () => {
    let state: PowerPlantState = withSpray(0.3)
    const start: number = loopWater(state)
    for (let i = 0; i < 200; i++) state = PowerPlantTick(state)
    expect(state.Boiler.sprayFlow).toBeGreaterThan(0)
    expect(Math.abs(loopWater(state) - start) / start).toBeLessThan(1e-9)
  })

  test("the spray cools the steam: more spray, a lower steam temperature after the lag", () => {
    const run = (position: number): number => {
      let state: PowerPlantState = withSpray(position)
      for (let i = 0; i < 600; i++) state = PowerPlantTick(state)
      return state.Boiler.steamTemperature
    }
    expect(run(0.4)).toBeLessThan(run(0))
  })
})
