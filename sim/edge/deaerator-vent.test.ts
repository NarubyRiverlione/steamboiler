import { describe, expect, test } from "vitest"
import { CstDeaerator } from "../../src/context/const"
import { getBoilingPoint } from "../../src/utils/steamTable"
import { runScenario, Sample } from "../scenario"
import { bypassLoop } from "../scenarios/bypass-loop"
import { deaeratorVentClosed } from "../scenarios/deaerator-vent-closed"
import { deaeratorVentOpen } from "../scenarios/deaerator-vent-open"

// The three cold starts of #120 (ADR 0038): vent opened and closed on time (`bypass-loop`), never opened, left open.
// The loop invariants of all three are checked by the invariant matrices (golden and edge).

const SetTemperature: number = getBoilingPoint(CstDeaerator.Pressure)
const firstTime = (samples: Sample[], condition: (s: Sample) => boolean): number | undefined => samples.find(condition)?.time
// The relief valve lifts for less than a sample, so the runs of the mistakes are sampled every tick
const everyTick = (s: typeof deaeratorVentClosed, duration: number) => ({ ...s, duration, sampleEvery: 0.1 })

describe("deaerator vent opened and closed on time (bypass-loop)", () => {
  const samples: Sample[] = runScenario(bypassLoop)
  const lampAt: number = firstTime(samples, (s) => s.state.Deaerator.safeToClose) ?? Infinity

  test("the air is out when the lamp lights, long before the vessel is hot, and the operator closes the vent at once", () => {
    expect(lampAt).toBeLessThan(firstTime(samples, (s) => s.state.Deaerator.temperature >= SetTemperature - 1) ?? 0)
    const closedAt: number | undefined = firstTime(samples, (s) => s.time > 0 && !s.state.Deaerator.startUpVentOpen)
    expect(closedAt).toBeGreaterThanOrEqual(lampAt)
    expect(closedAt).toBeLessThanOrEqual(lampAt + 10)
  })

  test("the vessel heats to 133.5 °C and 3 bar with no relief lift and no warning once the vent is closed", () => {
    const hot: Sample[] = samples.filter((s) => s.time > lampAt + 20)
    expect(Math.max(...samples.map((s) => s.state.Deaerator.pressure))).toBeLessThan(CstDeaerator.ReliefPressure)
    expect(samples.every((s) => !s.state.Deaerator.reliefValveOpen)).toBe(true)
    expect(hot.every((s) => !s.state.Deaerator.warnVentClosedWithAir && !s.state.Deaerator.warnVentOpenNoAir)).toBe(true)
    const last = samples[samples.length - 1].state.Deaerator
    expect(last.temperature).toBeCloseTo(SetTemperature, 0)
    expect(last.pressure).toBeCloseTo(CstDeaerator.Pressure, 1)
  })

  test("the steam lost at the start-up is a few hundred kg, then only the operating vent", () => {
    const at = (time: number): number => samples.find((s) => s.time >= time)?.state.Deaerator.ventedTotal ?? NaN
    expect(at(lampAt + 20)).toBeLessThan(300)
    // 0.08 kg/s: about 50 kg in 600 s
    expect(at(6600) - at(6000)).toBeLessThan(100)
    expect(at(6600) - at(6000)).toBeGreaterThan(10)
  })
})

describe("deaerator vent never opened (deaerator-vent-closed)", () => {
  const samples: Sample[] = runScenario(everyTick(deaeratorVentClosed, 900))
  const onTime: Sample[] = runScenario(bypassLoop)

  test("the heating lags the saturation: the pressure is above the saturation pressure while the air is there", () => {
    for (const { state } of samples.filter((s) => s.time >= 60)) expect(state.Deaerator.pressure).toBeGreaterThan(state.Deaerator.saturationPressure + 0.9 * state.Deaerator.airPressure)
    const early = samples.find((s) => s.time >= 360)?.state.Deaerator
    const reference = onTime.find((s) => s.time >= 360)?.state.Deaerator
    expect(early?.pressure).toBeGreaterThan((reference?.pressure ?? Infinity) + 0.5)
  })

  test("the pressure climbs past the setpoint and the 4 bar relief valve lifts, loses steam and takes the air with it", () => {
    const lift: number | undefined = firstTime(samples, (s) => s.state.Deaerator.reliefValveOpen)
    expect(lift).toBeDefined()
    // the valve decides on the pressure at the start of the tick, so the sample before the first open one is at or over the lift pressure
    const decided = samples[samples.findIndex((s) => s.time === lift) - 1].state.Deaerator
    expect(decided.pressure).toBeGreaterThanOrEqual(CstDeaerator.ReliefPressure)
    const after = samples.find((s) => s.time >= (lift ?? 0) + 60)?.state.Deaerator
    const before = samples.find((s) => s.time === lift)?.state.Deaerator
    expect(after?.ventedTotal).toBeGreaterThan((before?.ventedTotal ?? Infinity) + 20)
    expect(after?.airMass).toBeLessThan((before?.airMass ?? 0) - 10)
    // no damage: the pressure is held to the lift pressure plus what one tick's steam adds
    expect(Math.max(...samples.map((s) => s.state.Deaerator.pressure))).toBeLessThan(CstDeaerator.ReliefPressure + 0.5)
  })

  test("the warning flag is on while the air is present and the other is off", () => {
    const flagged = samples.filter((s) => s.time >= 60)
    expect(flagged.every((s) => s.state.Deaerator.warnVentClosedWithAir && !s.state.Deaerator.warnVentOpenNoAir)).toBe(true)
  })
})

describe("deaerator vent left open (deaerator-vent-open)", () => {
  const samples: Sample[] = runScenario(deaeratorVentOpen)
  const last = samples[samples.length - 1].state

  test("the air goes, the lamp lights and the flag for an open vent with no air is set from then on", () => {
    const lampAt: number | undefined = firstTime(samples, (s) => s.state.Deaerator.safeToClose)
    expect(lampAt).toBeDefined()
    for (const { time, state } of samples.filter((s) => s.time > (lampAt ?? 0) + 1)) {
      expect(state.Deaerator.warnVentOpenNoAir, `t=${String(time)} s`).toBe(true)
      expect(state.Deaerator.warnVentClosedWithAir).toBe(false)
    }
  })

  test("steam leaves the water balance through the vent: tonnes are lost, and the temperature stalls at 100 °C", () => {
    expect(last.Deaerator.ventedTotal).toBeGreaterThan(5000)
    expect(last.Deaerator.temperature).toBeCloseTo(100, 0)
    expect(Math.max(...samples.map((s) => s.state.Deaerator.temperature))).toBeLessThan(SetTemperature - 5)
  })
})
