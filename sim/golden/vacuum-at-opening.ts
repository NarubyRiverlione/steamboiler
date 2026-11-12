/**
 * The turbine valve may only open under vacuum (ADR 0003): the golden scenarios pull it first and the turbine never
 * trips. Judged on samples taken every tick, so a trip that a later opening clears again cannot slip between samples.
 */
import { describe, expect, test } from "vitest"
import { CstSimulation } from "../../src/context/const"
import { Sample } from "../scenario"

export function describeVacuumAtOpening(name: string, ticks: Sample[]): void {
  describe(`${name} under the vacuum limit`, () => {
    const limit = CstSimulation.CstCondenser.VacuumLimit
    const firstOpen = ticks.findIndex((s) => s.state.Turbine.turbineValvePosition > 0)

    test("condenser pressure is at or below the vacuum limit when the turbine valve first opens", () => {
      expect(firstOpen).toBeGreaterThanOrEqual(0)
      expect(ticks[firstOpen].state.Condenser.pressure).toBeLessThanOrEqual(limit)
    })

    test("no turbine trip after the turbine valve opens", () => {
      const afterOpening = ticks.slice(firstOpen)
      expect(afterOpening.filter((s) => s.state.Turbine.turbineTripped)).toEqual([])
    })
  })
}
