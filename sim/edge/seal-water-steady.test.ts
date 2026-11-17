import { describe, expect, test } from "vitest"
import { CstSimulation } from "../../src/context/const"
import { runChecked } from "../scenario-checks"
import { sealWaterSteady } from "../scenarios/seal-water-steady"

const { CAR_SealWaterWarning } = CstSimulation.CstCondenser

describe("seal-water-steady", () => {
  const { samples } = runChecked(sealWaterSteady)

  test("the cooler holds the seal water under the warning for two hours and the pump runs on", () => {
    expect(Math.max(...samples.map((s) => s.state.Condenser.sealWaterTemperature))).toBeLessThan(CAR_SealWaterWarning)
    const end = samples[samples.length - 1].state.Condenser
    expect(end.isAirExtractionPumpEnabled).toBe(true)
    expect(end.airPumpTripped).toBe(false)
  })

  test("the seal water has settled: it moved little over the last hour", () => {
    const end: number = samples[samples.length - 1].state.Condenser.sealWaterTemperature
    const hourBefore: number = (samples.find((s) => s.time >= sealWaterSteady.duration - 3600) ?? samples[0]).state.Condenser.sealWaterTemperature
    expect(Math.abs(end - hourBefore)).toBeLessThan(0.5)
  })
})
