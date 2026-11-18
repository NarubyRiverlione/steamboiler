import { describe, expect, test } from "vitest"
import { CstOil } from "../../src/context/const"
import { runChecked } from "../scenario-checks"
import { CloseAt, darkStart, PumpsAskedAt } from "../scenarios/dark-start"

describe("dark-start", () => {
  const { samples } = runChecked(darkStart)
  const dead = samples.filter((s) => s.time < CloseAt)
  const fed = samples.filter((s) => s.time > CloseAt)

  test("the pumps are asked for at the start, with the breaker open", () => {
    expect(samples[0].state.gridSupplyBreaker).toBe(false)
    expect(samples.find((s) => s.time > PumpsAskedAt)?.state.Condenser.condensationPumpValvePosition).toBe(0.1)
  })

  test("invariant: no pump flows and no oil builds while the bus is dead", () => {
    for (const { state } of dead.filter((s) => s.time > PumpsAskedAt)) {
      expect(state.Condenser.returnRate).toBe(0)
      expect(state.Oil.headerPressure).toBe(0)
      expect(state.auxiliaryLoad).toBe(0)
    }
  })

  test("goal: the pumps deliver flow after the breaker closes, at the positions the operator set", () => {
    const last = fed[fed.length - 1].state
    expect(last.gridSupplyBreaker).toBe(true)
    expect(last.Condenser.condensationPumpValvePosition).toBe(0.1)
    expect(fed.some((s) => s.state.Condenser.returnRate > 0)).toBe(true)
    expect(last.Oil.headerPressure).toBeGreaterThan(CstOil.PermissivePressure)
    expect(last.auxiliaryLoad).toBeGreaterThan(0)
  })
})
