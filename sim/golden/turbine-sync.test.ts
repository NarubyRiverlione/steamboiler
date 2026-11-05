import { describe, expect, test } from "vitest"
import { firstTimeWhere, runScenario } from "../scenario"
import { loadSnapshot } from "../snapshot"
import { turbineSync } from "../scenarios/turbine-sync"
import { CstSimulation } from "../../src/context/const"

const { SyncRPM, BreakerRPMMargin } = CstSimulation.CstTurbine
const SteadyWindow = 600 // sim-seconds at the end of the run that count as steady

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
})
