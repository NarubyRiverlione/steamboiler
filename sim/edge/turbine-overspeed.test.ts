import { describe, expect, test } from "vitest"
import { CstSimulation } from "../../src/context/const"
import { runChecked } from "../scenario-checks"
import { OpenAt, turbineOverspeed } from "../scenarios/turbine-overspeed"

const { MaxRPM } = CstSimulation.CstTurbine

describe("turbine-overspeed", () => {
  // every tick, so the trip can be pinned to one tick
  const { samples } = runChecked(turbineOverspeed, { sampleEvery: CstSimulation.DeltaTime })
  const tripped = samples.findIndex((s) => s.state.Turbine.turbineTripped)

  test("the unloaded rotor accelerates once the valve opens", () => {
    const start = samples.find((s) => s.time >= OpenAt)
    expect(samples[0].state.Turbine.generatorBreaker).toBe(false)
    expect(start?.state.Turbine.speedMode).toBe("free")
    expect(tripped).toBeGreaterThan(0)
    expect(samples[tripped - 1].state.Turbine.rpm).toBeGreaterThan(samples[0].state.Turbine.rpm)
  })

  test("the trip fires when the speed reaches the limit, and the peak is at most one tick above it", () => {
    expect(samples[tripped - 1].state.Turbine.rpm).toBeLessThan(MaxRPM)
    expect(samples[tripped - 1].state.Turbine.turbineTripped).toBe(false)
    const peak: number = Math.max(...samples.map((s) => s.state.Turbine.rpm))
    const perTick: number = samples[tripped].state.Turbine.rpm - samples[tripped - 1].state.Turbine.rpm
    expect(samples[tripped].state.Turbine.rpm).toBeGreaterThanOrEqual(MaxRPM)
    // the tick after the trip still has the flow of the last open tick in the state (it is zero from then on), so the peak is
    // the trip tick plus at most one more tick of that acceleration
    expect(peak).toBeLessThanOrEqual(samples[tripped - 1].state.Turbine.rpm + 2 * perTick)
    expect(peak).toBe(Math.max(samples[tripped].state.Turbine.rpm, samples[tripped + 1].state.Turbine.rpm))
  })

  test("afterwards the valve is shut, the mode is Free and the flag stays set while the speed falls", () => {
    for (const { state } of samples.slice(tripped)) {
      expect(state.Turbine.turbineValvePosition).toBe(0)
      expect(state.Turbine.speedMode).toBe("free")
      expect(state.Turbine.turbineTripped).toBe(true)
    }
    const last = samples[samples.length - 1].state.Turbine.rpm
    expect(last).toBeLessThan(samples[tripped].state.Turbine.rpm)
  })

  test("the pressure stays under the design pressure", () => {
    for (const { state } of samples) expect(state.Boiler.pressure).toBeLessThan(CstSimulation.CstBoiler.DesignPressure)
  })
})
