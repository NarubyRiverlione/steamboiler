import { describe, expect, test } from "vitest"
import { CstTurningGear } from "../../src/context/const"
import { runChecked } from "../scenario-checks"
import { loadSnapshot } from "../snapshot"
import { DisengageAt, EngageAt, GlandOnAt, RampUpAt, RefusedGlandAt, RefusedOpenAt, turningGear } from "../scenarios/turning-gear"

describe("turning-gear", () => {
  const { samples } = runChecked(turningGear)
  const at = (time: number) => (samples.find((s) => s.time >= time) ?? samples[samples.length - 1]).state

  test("the settled standby has the rotor on the gear at gear speed with the gland steam on", () => {
    const start = loadSnapshot("bypass-loop").Turbine
    expect(start.turningGearEngaged).toBe(true)
    expect(start.rpm).toBeCloseTo(CstTurningGear.Rpm, 3)
    expect(start.glandSteamOn).toBe(true)
  })

  test("the hand disengage stops the rotor and the gland steam goes off with it", () => {
    expect(at(DisengageAt + 5).Turbine.turningGearEngaged).toBe(false)
    expect(at(DisengageAt + 5).Turbine.rpm).toBe(0)
    expect(at(DisengageAt + 5).Turbine.glandSteamOn).toBe(false)
  })

  test("the valve and the gland steam are refused on the stopped rotor", () => {
    expect(at(RefusedOpenAt + 1).Turbine.turbineValvePosition).toBe(0)
    expect(at(RefusedGlandAt + 1).Turbine.glandSteamOn).toBe(false)
    expect(at(EngageAt - 1).Turbine.rpm).toBe(0)
  })

  test("the gear takes the rotor again and the gland steam is admitted on it", () => {
    expect(at(EngageAt + 5).Turbine.turningGearEngaged).toBe(true)
    expect(at(EngageAt + 5).Turbine.rpm).toBeCloseTo(CstTurningGear.Rpm, 3)
    expect(at(GlandOnAt + 1).Turbine.glandSteamOn).toBe(true)
  })

  test("on the gear the PID opens the valve, the steam rolls the rotor and the gear throws itself out", () => {
    expect(at(RampUpAt + 30).Turbine.turbineValvePosition).toBeGreaterThan(0)
    const out = samples.find((s) => s.time > RampUpAt && !s.state.Turbine.turningGearEngaged)
    expect(out?.state.Turbine.rpm).toBeGreaterThan(CstTurningGear.StandstillRpm)
    expect(samples[samples.length - 1].state.Turbine.rpm).toBeGreaterThan(CstTurningGear.StandstillRpm)
    expect(samples[samples.length - 1].state.Turbine.glandSteamOn).toBe(true)
  })
})
