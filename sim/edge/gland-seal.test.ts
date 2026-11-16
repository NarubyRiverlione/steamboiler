import { describe, expect, test } from "vitest"
import { CstSimulation } from "../../src/context/const"
import { runChecked } from "../scenario-checks"
import { GearOnAt, GlandOnAt, RefusedAt, glandSeal } from "../scenarios/gland-seal"

const { OptimalPressure, AirLeakRate, OpenGlandAirLeakRate } = CstSimulation.CstCondenser

describe("gland-seal", () => {
  const { samples } = runChecked(glandSeal)
  const at = (time: number) => (samples.find((s) => s.time >= time) ?? samples[samples.length - 1]).state

  test("the gland steam is refused while the rotor is stopped with the gear out", () => {
    expect(at(RefusedAt + 1).Turbine.glandSteamOn).toBe(false)
  })

  test("the gear on, the steam is still off until the operator admits it: the glands leak open", () => {
    expect(at(GearOnAt + 5).Turbine.turningGearEngaged).toBe(true)
    expect(at(GlandOnAt - 10).Turbine.glandSteamOn).toBe(false)
  })

  test("with the glands open the SJAE alone stalls the vacuum short of the design vacuum", () => {
    const stalled = at(GlandOnAt - 10).Condenser
    expect(stalled.pressure).toBeGreaterThan(OptimalPressure * 1.5)
    // stalled: it moved little over the last 500 s
    expect(Math.abs(stalled.pressure - at(GlandOnAt - 500).Condenser.pressure)).toBeLessThan(0.05 * stalled.pressure)
  })

  test("the gland steam on, the leak drops and the vacuum draws down", () => {
    expect(at(GlandOnAt + 5).Turbine.glandSteamOn).toBe(true)
    expect(at(GlandOnAt - 10).Condenser.pressure).toBeGreaterThan(at(samples[samples.length - 1].time).Condenser.pressure * 1.5)
    expect(samples[samples.length - 1].state.Condenser.pressure).toBeLessThan(OptimalPressure * 1.2)
    expect(OpenGlandAirLeakRate).toBeGreaterThan(AirLeakRate)
  })

  test("the gland steam takes a small flow from the boiler and returns it: the water invariant held (runChecked)", () => {
    expect(at(GlandOnAt + 5).Turbine.glandSteamOn).toBe(true)
  })
})
