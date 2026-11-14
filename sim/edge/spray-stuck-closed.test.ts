import { describe, expect, test } from "vitest"
import { CstSimulation, CstSuperheater } from "../../src/context/const"
import { activeAlarms } from "../../src/context/Alarms"
import { CstSteamTableLimit } from "./steam-limit"
import { runChecked } from "../scenario-checks"
import { StuckAt, sprayStuckClosed } from "../scenarios/spray-stuck-closed"

const { CstBoiler, CstTurbine } = CstSimulation

describe("spray-stuck-closed", () => {
  const { samples } = runChecked(sprayStuckClosed)
  const before = samples.filter((s) => s.time < StuckAt)
  const after = samples.filter((s) => s.time > StuckAt + 1)
  const last = samples[samples.length - 1].state

  test("the attemperator holds the steam at its setpoint before the valve sticks", () => {
    expect(Math.abs(before[before.length - 1].state.Boiler.steamTemperature - CstSuperheater.SteamTemperature)).toBeLessThan(15)
  })

  test("the valve is in Manual at 0% and stays shut: no spray water is injected", () => {
    for (const { state } of after) {
      expect(state.Boiler.attemperatorAuto).toBe(false)
      expect(state.Boiler.sprayValvePosition).toBe(0)
      expect(state.Boiler.sprayFlow).toBe(0)
    }
  })

  test("the steam runs hot: it passes the alarm temperature and the high steam temperature alarm fires", () => {
    expect(last.Boiler.steamTemperature).toBeGreaterThan(CstSuperheater.AlarmTemperature)
    expect(activeAlarms(last)).toContain("steamTemperatureHigh")
    expect(before.some((s) => activeAlarms(s.state).includes("steamTemperatureHigh"))).toBe(false)
  })

  test("nothing trips: the alarm is the only protection", () => {
    for (const { state } of samples) {
      expect(state.Turbine.turbineTripped).toBe(false)
      expect(state.Boiler.burnerTripped).toBe(false)
      expect(state.Boiler.boilerLevelHighTripped).toBe(false)
    }
  })

  test("the plant stays within its limits: sync speed, pressure under the relief valve, steam inside the steam table", () => {
    for (const { state } of samples) {
      expect(Math.abs(state.Turbine.rpm - CstTurbine.SyncRPM)).toBeLessThanOrEqual(CstTurbine.BreakerRPMMargin)
      expect(state.Boiler.pressure).toBeLessThan(CstBoiler.ReliefOpenPressure)
      expect(state.Boiler.steamTemperature).toBeLessThanOrEqual(CstSteamTableLimit(state.Boiler.pressure))
    }
    expect(last.Boiler.reliefLifts).toBe(0)
  })
})
