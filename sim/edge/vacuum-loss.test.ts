import { describe, expect, test } from "vitest"
import { CstSimulation } from "../../src/context/const"
import { runScenario } from "../scenario"
import { vacuumLoss } from "../scenarios/vacuum-loss"

const { VacuumLimit, AirLeakRate } = CstSimulation.CstCondenser

describe("vacuum-loss", () => {
  // every tick, so the trip can be pinned to one tick
  const samples = runScenario({ ...vacuumLoss, sampleEvery: CstSimulation.DeltaTime })
  const tripped = samples.findIndex((s) => s.state.Turbine.turbineTripped)

  test("with the pump and the SJAE off, the air builds up at exactly the in-leakage rate", () => {
    const first = samples[1].state.Condenser
    const later = samples[120].state.Condenser
    expect(first.isAirExtractionPumpEnabled).toBe(false)
    expect(first.isSjaeEnabled).toBe(false)
    expect(later.airMass - first.airMass).toBeCloseTo(AirLeakRate * (samples[120].time - samples[1].time), 6)
  })

  test("the pressure rises past the vacuum limit and the turbine trips on it", () => {
    expect(samples[0].state.Condenser.pressure).toBeLessThan(VacuumLimit)
    expect(tripped).toBeGreaterThan(0)
    // The trip acts on the pressure the tick before: the sample before the trip is over the limit
    expect(samples[tripped - 1].state.Condenser.pressure).toBeGreaterThan(VacuumLimit)
    expect(samples[tripped - 1].state.Turbine.turbineTripped).toBe(false)
    expect(samples[tripped].state.Turbine.turbineValvePosition).toBe(0)
  })

  test("the air only ever grows: nothing removes it", () => {
    for (let i = 1; i < samples.length; i++)
      expect(samples[i].state.Condenser.airMass).toBeGreaterThanOrEqual(samples[i - 1].state.Condenser.airMass)
  })
})
