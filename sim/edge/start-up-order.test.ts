import { describe, expect, test } from "vitest"
import { CstOil, CstTurningGear } from "../../src/context/const"
import { runChecked } from "../scenario-checks"
import { GearOnAt, GlandAt, GlandOnAt, OilOnAt, RampUpAt, ValveNoGearAt, ValveNoOilAt, startUpOrder } from "../scenarios/start-up-order"

describe("start-up-order", () => {
  const { samples } = runChecked(startUpOrder)
  const at = (time: number) => (samples.find((s) => s.time >= time) ?? samples[samples.length - 1]).state

  test("the valve without oil is refused: the valve stays shut", () => {
    expect(at(ValveNoOilAt + 1).Oil.headerPressure).toBe(0)
    expect(at(ValveNoOilAt + 1).Turbine.turbineValvePosition).toBe(0)
  })

  test("the gland steam on the stopped rotor with the gear out is refused", () => {
    expect(at(GlandAt + 1).Turbine.glandSteamOn).toBe(false)
    expect(at(GlandAt + 1).Turbine.rpm).toBe(0)
  })

  test("with the oil up but the gear out the valve is still refused on the stopped rotor", () => {
    expect(at(ValveNoGearAt - 1).Oil.headerPressure).toBeGreaterThanOrEqual(CstOil.PermissivePressure)
    expect(at(ValveNoGearAt + 1).Turbine.turbineValvePosition).toBe(0)
    expect(at(ValveNoGearAt + 1).Turbine.rpm).toBe(0)
    expect(at(OilOnAt - 1).Oil.headerPressure).toBe(0)
  })

  test("in the real order the gear and the gland steam go on, the steam rolls the rotor and the gear throws itself out", () => {
    expect(at(GearOnAt + 1).Turbine.turningGearEngaged).toBe(true)
    expect(at(GlandOnAt + 1).Turbine.glandSteamOn).toBe(true)
    expect(at(RampUpAt + 30).Turbine.turbineValvePosition).toBeGreaterThan(0)
    const last = samples[samples.length - 1].state.Turbine
    expect(last.rpm).toBeGreaterThan(CstTurningGear.StandstillRpm)
    expect(last.turningGearEngaged).toBe(false)
    expect(last.glandSteamOn).toBe(true)
  })
})
