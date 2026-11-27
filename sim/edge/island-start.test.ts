import { describe, expect, test } from "vitest"
import { CstOil } from "../../src/context/const"
import { isVitalBusLive } from "../../src/context/SafetyBus"
import { runChecked } from "../scenario-checks"
import { CloseAt, EarlyCloseAt, EarlyUpsCloseAt, islandStart, PumpsAskedAt, RefusedRunAt, RunAt, SelectorOffAt, UpsCloseAt, VitalFeedAt } from "../scenarios/island-start"

describe("island-start", () => {
  const { samples } = runChecked(islandStart)
  const at = (time: number) => (samples.find((s) => s.time >= time) ?? samples[samples.length - 1]).state
  const dead = samples.filter((s) => s.time < CloseAt)
  const fed = samples.filter((s) => s.time > CloseAt)

  test("every source is dead and the pumps are asked for at the start", () => {
    expect(samples[0].state.gridSupplyBreaker).toBe(false)
    expect(samples[0].state.vitalFeedBreaker).toBe(false)
    expect(samples[0].state.safetyFeedBreaker).toBe(false)
    expect(samples[0].state.dieselBreaker).toBe(false)
    expect(samples[0].state.emySelector).toBe("AUTO")
    expect(at(PumpsAskedAt + 1).Condenser.condensationPumpValvePosition).toBe(0.1)
  })

  test("the EMY diesel starts by itself and closes onto the Vital bus; the big diesel's RUN is refused until then", () => {
    expect(at(RefusedRunAt + 1).Diesel.status).toBe("stopped")
    expect(at(RefusedRunAt + 1).EmergencyDiesel.status).toBe("starting")
    expect(at(20).emyBreaker).toBe(true)
  })

  test("Aux→Vital is refused while the Auxiliary bus is dead", () => {
    expect(at(VitalFeedAt - 10).vitalFeedBreaker).toBe(false)
    expect(at(CloseAt - 1).vitalFeedBreaker).toBe(false)
  })

  test("Vital→Safety is refused during the warm-up and closes after it", () => {
    expect(at(EarlyUpsCloseAt + 1).safetyFeedBreaker).toBe(false)
    expect(at(UpsCloseAt + 1).safetyFeedBreaker).toBe(true)
  })

  test("the close during the big diesel's start is refused, it runs after its start time", () => {
    expect(at(RunAt + 1).Diesel.status).toBe("starting")
    expect(at(EarlyCloseAt + 1).dieselBreaker).toBe(false)
    expect(at(CloseAt).Diesel.status).toBe("running")
  })

  test("invariant: no pump flows and no oil builds while the Auxiliary bus is dead", () => {
    for (const { state } of dead.filter((s) => s.time > PumpsAskedAt)) {
      expect(state.Condenser.returnRate).toBe(0)
      expect(state.Oil.headerPressure).toBe(0)
      expect(state.auxiliaryLoad).toBe(0)
    }
  })

  test("Aux→Vital takes the Vital bus over, the EMY breaker opens on that tick and the selector goes OFF", () => {
    const handed = at(VitalFeedAt + 0.5)
    expect(handed.vitalFeedBreaker).toBe(true)
    expect(handed.emyBreaker).toBe(false)
    expect(handed.Diesel.status).toBe("running")
    expect(handed.safetyFeedBreaker).toBe(true)
    expect(at(SelectorOffAt + 1).EmergencyDiesel.status).toBe("stopped")
    expect(at(SelectorOffAt + 1).emyBreaker).toBe(false)
    expect(isVitalBusLive(at(SelectorOffAt + 1))).toBe(true)
  })

  test("goal: the pumps deliver flow after the big diesel's breaker closes, at the positions the operator set", () => {
    const last = fed[fed.length - 1].state
    expect(last.dieselBreaker).toBe(true)
    expect(last.gridSupplyBreaker).toBe(false)
    expect(last.simulationEnded).toBe(false)
    expect(last.Condenser.condensationPumpValvePosition).toBe(0.1)
    expect(fed.some((s) => s.state.Condenser.returnRate > 0)).toBe(true)
    expect(last.Oil.headerPressure).toBeGreaterThan(CstOil.PermissivePressure)
    expect(last.auxiliaryLoad).toBeGreaterThan(0)
  })
})
