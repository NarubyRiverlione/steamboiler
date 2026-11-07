import { describe, expect, test } from "vitest"
import { CstSimulation } from "../../src/context/const"
import { runScenario } from "../scenario"
import { lowPressureClose } from "../scenarios/low-pressure-close"

const { MainSteamValveMinimumPressure } = CstSimulation.CstTurbine

describe("low-pressure-close", () => {
  // every tick, so the closure can be pinned to one tick
  const samples = runScenario({ ...lowPressureClose, sampleEvery: CstSimulation.DeltaTime })
  const closed: number = samples.findIndex((s) => !s.state.Turbine.mainSteamValve)
  const before = samples[closed - 1].state
  const at = samples[closed].state
  const after = samples.slice(closed)

  test("the main steam valve closes on the first tick that starts at or below the limit", () => {
    expect(closed).toBeGreaterThan(1)
    expect(samples[closed - 2].state.Boiler.pressure).toBeGreaterThan(MainSteamValveMinimumPressure)
    expect(before.Boiler.pressure).toBeLessThanOrEqual(MainSteamValveMinimumPressure)
  })

  test("the closure is the turbine trip: same tick, turbine valve open until then, condenser under vacuum", () => {
    expect(before.Turbine.turbineValvePosition).toBeGreaterThan(0)
    expect(before.Turbine.turbineTripped).toBe(false)
    expect(before.Condenser.pressure).toBeLessThan(CstSimulation.CstCondenser.VacuumLimit)
    expect(at.Turbine.turbineTripped).toBe(true)
    expect(at.Turbine.turbineValvePosition).toBe(0)
    expect(at.Turbine.speedMode).toBe("free")
    expect(at.Turbine.pidIntegralError).toBe(0)
  })

  test("steam flows until the closure and none leaves through either valve after it", () => {
    expect(before.Turbine.bypassSteamFlowOut).toBeGreaterThan(10)
    expect(before.Turbine.turbineSteamFlowOut).toBeGreaterThan(0)
    expect(after.filter((s) => s.state.Turbine.mainSteamValve)).toEqual([])
    expect(after.map((s) => s.state.Turbine.bypassSteamFlowOut + s.state.Turbine.turbineSteamFlowOut)).toEqual(
      after.map(() => 0),
    )
  })
})
