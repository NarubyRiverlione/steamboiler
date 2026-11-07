import { describe, expect, test } from "vitest"
import { CstSimulation } from "../../src/context/const"
import { runScenario } from "../scenario"
import { TripAt, turbineTrip } from "../scenarios/turbine-trip"

const { CstBoiler } = CstSimulation

describe("turbine-trip", () => {
  const samples = runScenario(turbineTrip)
  const before = samples.filter((s) => s.time < TripAt)
  const after = samples.filter((s) => s.time > TripAt + 1)
  const rated = before[before.length - 1].state

  test("the plant carries its load with the heater working before the trip", () => {
    expect(rated.Turbine.electricOutput).toBeCloseTo(125, 0)
    expect(rated.Heater.extractionFlow).toBeGreaterThan(30)
    expect(rated.Heater.returnTemperature).toBeGreaterThan(140)
  })

  test("the heater loses its steam at once: nothing is extracted and the Return turns cold", () => {
    for (const { state } of after) {
      expect(state.Turbine.turbineSteamFlowOut).toBe(0)
      expect(state.Heater.extractionFlow).toBe(0)
      expect(state.Heater.tapPressure).toBe(0)
    }
    // the Return reaching the economizer is the hotwell's: cold
    const cold = after[0].state
    expect(cold.Heater.returnTemperature).toBeLessThan(60)
    expect(cold.Heater.returnTemperature).toBe(cold.Condenser.hotwellTemperature)
  })

  test("the pressure stays under the design pressure", () => {
    const peak: number = Math.max(...samples.map((s) => s.state.Boiler.pressure))
    expect(peak).toBeLessThan(CstBoiler.DesignPressure)
  })
})
