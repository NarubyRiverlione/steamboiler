import { describe, expect, test } from "vitest"
import { CstTurningGear } from "../../src/context/const"
import { runChecked } from "../scenario-checks"
import { DisengageAt, EngageAt, NoOilEngageAt, RampUpAt, RefusedOpenAt, turningGear } from "../scenarios/turning-gear"

describe("turning-gear", () => {
  const { samples } = runChecked(turningGear)
  const at = (time: number) => (samples.find((s) => s.time >= time) ?? samples[samples.length - 1]).state

  test("the engage with no oil is refused: the gear stays out and the rotor stands still", () => {
    expect(at(NoOilEngageAt + 1).Turbine.turningGearEngaged).toBe(false)
    expect(at(EngageAt - 1).Turbine.rpm).toBe(0)
  })

  test("the engage on the built pressure holds the stopped rotor at gear speed", () => {
    expect(at(EngageAt + 5).Turbine.turningGearEngaged).toBe(true)
    expect(at(EngageAt + 5).Turbine.rpm).toBeCloseTo(CstTurningGear.Rpm, 3)
    expect(at(DisengageAt - 1).Turbine.rpm).toBeCloseTo(CstTurningGear.Rpm, 3)
  })

  test("the valve stays shut on gear, for the hand and for the Ramp up PID", () => {
    expect(at(RampUpAt + 1).Turbine.speedMode).toBe("rampUp")
    expect(at(RefusedOpenAt + 1).Turbine.turbineValvePosition).toBe(0)
    expect(at(DisengageAt - 1).Turbine.turbineValvePosition).toBe(0)
  })


  test("disengaged, the PID opens the valve and the turbine rolls", () => {
    expect(at(DisengageAt + 1).Turbine.turningGearEngaged).toBe(false)
    expect(at(DisengageAt + 30).Turbine.turbineValvePosition).toBeGreaterThan(0)
    expect(at(DisengageAt + 60).Turbine.rpm).toBeGreaterThan(CstTurningGear.Rpm * 10)
  })
})
