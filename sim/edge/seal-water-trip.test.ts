import { describe, expect, test } from "vitest"
import { CstSimulation } from "../../src/context/const"
import { runChecked } from "../scenario-checks"
import { sealWaterTrip } from "../scenarios/seal-water-trip"

const { CAR_SealWaterWarning, CAR_SealWaterTrip, VacuumLimit } = CstSimulation.CstCondenser

describe("seal-water-trip", () => {
  const { samples } = runChecked(sealWaterTrip)
  const firstTime = (predicate: (s: (typeof samples)[number]) => boolean): number => samples.find(predicate)?.time ?? Infinity
  const warnedAt: number = firstTime((s) => s.state.Condenser.sealWaterTemperature >= CAR_SealWaterWarning)
  const trippedAt: number = firstTime((s) => s.state.Condenser.airPumpTripped)

  test("the seal water heats past the warning and then the pump trips, in that order", () => {
    expect(warnedAt).toBeLessThan(Infinity)
    expect(trippedAt).toBeGreaterThan(warnedAt)
    const atTrip = samples.find((s) => s.time >= trippedAt)
    expect(atTrip?.state.Condenser.sealWaterTemperature).toBeGreaterThanOrEqual(CAR_SealWaterTrip)
  })

  test("the tripped pump is stopped and stays tripped", () => {
    const after = samples.filter((s) => s.time >= trippedAt)
    expect(after.every((s) => s.state.Condenser.airPumpTripped && !s.state.Condenser.isAirExtractionPumpEnabled)).toBe(true)
  })

  test("the SJAE holds the vacuum through the trip and the turbine does not trip", () => {
    expect(samples.some((s) => s.state.Turbine.turbineTripped)).toBe(false)
    expect(Math.max(...samples.map((s) => s.state.Condenser.pressure))).toBeLessThan(VacuumLimit)
  })
})
