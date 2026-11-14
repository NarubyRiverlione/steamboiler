import { describe, expect, test } from "vitest"
import { CstDeaerator, CstSimulation } from "../../src/context/const"
import { runChecked } from "../scenario-checks"
import { TripAt, turbineTrip } from "../scenarios/turbine-trip"

const { CstBoiler } = CstSimulation

describe("turbine-trip", () => {
  const { samples } = runChecked(turbineTrip)
  const before = samples.filter((s) => s.time < TripAt)
  const after = samples.filter((s) => s.time > TripAt + 1)
  const rated = before[before.length - 1].state

  test("the plant carries its load with the heater working before the trip", () => {
    expect(rated.Turbine.electricOutput).toBeCloseTo(125, 0)
    expect(rated.Heater.extractionFlow).toBeGreaterThan(1.5)
    expect(rated.Deaerator.extractionFlow).toBeGreaterThan(15)
    expect(rated.Heater.returnTemperature).toBeGreaterThan(140)
  })

  test("the heater loses its steam at once: nothing is extracted and the feedwater reaches the economizer at the deaerator temperature", () => {
    for (const { state } of after) {
      expect(state.Turbine.turbineSteamFlowOut).toBe(0)
      expect(state.Heater.extractionFlow).toBe(0)
      expect(state.Heater.tapPressure).toBe(0)
    }
    const cold = after[0].state
    expect(cold.Heater.returnTemperature).toBe(cold.Deaerator.temperature)
  })

  // Split range (ADR 0036): the tap is gone with the turbine, the let-down valve takes over and the 3 bar holds
  test("the let-down valve takes over from the tap and the deaerator keeps 3 bar", () => {
    const last = after[after.length - 1].state
    expect(last.Deaerator.extractionFlow).toBe(0)
    expect(after.some((s) => s.state.Deaerator.letDownFlow > 0)).toBe(true)
    for (const { state } of after.filter((s) => s.time > TripAt + 30))
      expect(Math.abs(state.Deaerator.pressure - CstDeaerator.Pressure)).toBeLessThan(0.1)
  })

  test("the pressure stays under the design pressure", () => {
    const peak: number = Math.max(...samples.map((s) => s.state.Boiler.pressure))
    expect(peak).toBeLessThan(CstBoiler.DesignPressure)
  })
})
