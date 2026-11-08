import { describe, expect, test } from "vitest"
import { firstTimeWhere, runScenario, Sample } from "../scenario"
import { loadSnapshot } from "../snapshot"
import { syncOperator, turbineSync } from "../scenarios/turbine-sync"
import { CstSimulation } from "../../src/context/const"
import PowerPlantAction from "../../src/context/PowerPlantActions"
import PowerPlantState from "../../src/context/PowerPlantState"

const { DeltaTime } = CstSimulation
const { SyncRPM, BreakerRPMMargin, HoldEngageWindow } = CstSimulation.CstTurbine
const SteadyWindow = 600 // sim-seconds at the end of the run that count as steady
const EngageDuration = 120 // sim-seconds after a Hold engage, well past the settling (under 1 s measured, #63)
const MaxEngageDeviation = 10 // rpm from sync speed allowed while Hold settles (#63)

// The breaker closes at most once: from its first closed tick on it stays closed
function reopens(samples: Sample[]): boolean {
  const closedFrom = samples.findIndex((s) => s.state.Turbine.generatorBreaker)
  return closedFrom >= 0 && samples.slice(closedFrom).some((s) => !s.state.Turbine.generatorBreaker)
}

// The settled snapshot, but in Free at `offset` rpm from sync speed, with the operator engaging Hold at once
function engageHoldFromFree(offset: number): Sample[] {
  const snapshot: PowerPlantState = loadSnapshot("turbine-runup")
  const rpm: number = SyncRPM + offset
  const engageOnce = (state: PowerPlantState, time: number): PowerPlantAction[] => [
    ...(time === 0 ? [{ type: "SET_SPEED_MODE", payload: { speedMode: "hold" } } as const] : []),
    ...syncOperator(state, time),
  ]
  return runScenario({
    ...turbineSync,
    duration: EngageDuration,
    sampleEvery: DeltaTime,
    initial: {
      ...snapshot,
      Turbine: { ...snapshot.Turbine, rpm, speedMode: "free", speedReference: rpm, pidIntegralError: 0 },
    },
    operator: engageOnce,
  })
}

describe("turbine-sync", () => {
  const samples = runScenario(turbineSync)
  const last = samples.filter((s) => s.time >= turbineSync.duration - SteadyWindow)

  test("starts in Hold at 3000 rpm, within the breaker margin, with the breaker open", () => {
    const { Turbine } = loadSnapshot("turbine-runup")
    expect(Turbine.speedMode).toBe("hold")
    expect(Turbine.runUpPoint).toBe(SyncRPM)
    expect(Math.abs(Turbine.rpm - SyncRPM)).toBeLessThanOrEqual(BreakerRPMMargin)
    expect(Turbine.generatorBreaker).toBe(false)
  })

  test("the breaker closes once the speed is within the margin", () => {
    const closedAt = firstTimeWhere(samples, (s) => s.Turbine.generatorBreaker)
    const inSyncAt = firstTimeWhere(samples, (s) => Math.abs(s.Turbine.rpm - SyncRPM) <= BreakerRPMMargin)
    expect(closedAt).toBeDefined()
    expect(closedAt).toBeGreaterThanOrEqual(inSyncAt ?? Infinity)
  })

  test("over the last 600 s the breaker stays closed (it reopens itself outside ±2 rpm), in Hold", () => {
    for (const { state } of last) {
      expect(state.Turbine.generatorBreaker).toBe(true)
      expect(state.Turbine.speedMode).toBe("hold")
      expect(Math.abs(state.Turbine.rpm - SyncRPM)).toBeLessThanOrEqual(BreakerRPMMargin)
    }
  })

  test("the relief valve never lifts", () => {
    expect(samples.at(-1)?.state.Boiler.reliefLifts).toBe(0)
  })

  test("per tick, the breaker closes once and never reopens", () => {
    const ticks = runScenario({ ...turbineSync, sampleEvery: DeltaTime })
    expect(ticks.some((s) => s.state.Turbine.generatorBreaker)).toBe(true)
    expect(reopens(ticks)).toBe(false)
  })

  // turbine-sync itself starts settled in Hold, so this is what guards the engage
  describe.each([-HoldEngageWindow, HoldEngageWindow])("Hold engaged from Free at %d rpm from sync speed", (offset) => {
    const ticks = engageHoldFromFree(offset)

    test("engages and settles within the breaker margin, with the breaker closed once", () => {
      const end = ticks.at(-1)?.state.Turbine
      expect(end?.speedMode).toBe("hold")
      expect(Math.abs((end?.rpm ?? 0) - SyncRPM)).toBeLessThanOrEqual(BreakerRPMMargin)
      expect(end?.generatorBreaker).toBe(true)
      expect(reopens(ticks)).toBe(false)
    })

    test("the valve never shuts and the speed stays within 10 rpm of sync", () => {
      for (const { state } of ticks) {
        expect(state.Turbine.turbineValvePosition).toBeGreaterThan(0)
        expect(Math.abs(state.Turbine.rpm - SyncRPM)).toBeLessThanOrEqual(MaxEngageDeviation)
      }
    })
  })
})
