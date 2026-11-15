import { describe, expect, test } from "vitest"
import { CstDeaerator } from "../../src/context/const"
import { getBoilingPoint } from "../../src/utils/steamTable"
import { Sample } from "../scenario"
import { runChecked } from "../scenario-checks"
import { deaeratorVentOpen } from "../scenarios/deaerator-vent-open"

// The cold start with the deaerator start-up vent left open (#120, ADR 0038)

const SetTemperature: number = getBoilingPoint(CstDeaerator.Pressure)
const { samples } = runChecked(deaeratorVentOpen)
const firstTime = (condition: (s: Sample) => boolean): number | undefined => samples.find(condition)?.time

describe("deaerator vent left open (deaerator-vent-open)", () => {
  const last = samples[samples.length - 1].state

  test("the air goes, the lamp lights and the flag for an open vent with no air is set from then on", () => {
    const lampAt: number | undefined = firstTime((s) => s.state.Deaerator.safeToClose)
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
