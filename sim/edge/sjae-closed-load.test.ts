import { describe, expect, test } from "vitest"
import { CstSimulation } from "../../src/context/const"
import { runScenario } from "../scenario"
import { sjaeClosedLoad } from "../scenarios/sjae-closed-load"

const { VacuumLimit, OptimalPressure } = CstSimulation.CstCondenser

describe("sjae-closed-load", () => {
  const samples = runScenario(sjaeClosedLoad)
  const last = samples.filter((s) => s.time > sjaeClosedLoad.duration - 600)

  test("the SJAE valve is shut and the air extraction pump runs", () => {
    const end = samples[samples.length - 1].state.Condenser
    expect(end.sjaeValvePosition).toBe(0)
    expect(end.isAirExtractionPumpEnabled).toBe(true)
  })

  test("the load is carried and the turbine never trips", () => {
    expect(samples[samples.length - 1].state.Turbine.electricOutput).toBeCloseTo(125, 0)
    expect(samples.some((s) => s.state.Turbine.turbineTripped)).toBe(false)
  })

  test("the pump alone holds the air at a trace and the vacuum at the design vacuum", () => {
    for (const { state } of last) {
      expect(state.Condenser.airMass).toBeLessThan(0.1)
      expect(state.Condenser.pressure).toBeLessThan(VacuumLimit)
      expect(Math.abs(state.Condenser.pressure - OptimalPressure)).toBeLessThan(20)
    }
  })
})
