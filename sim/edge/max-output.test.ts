import { describe, expect, test } from "vitest"
import { CstSimulation } from "../../src/context/const"
import { ratedOutputMW } from "../../src/utils/turbineCalculations"
import { runScenario } from "../scenario"
import { maxOutput } from "../scenarios/max-output"
import { PressureHoldSettings } from "../scenarios/pressure-hold"

const { CstBoiler, CstCondenser, CstTurbine } = CstSimulation
const MaxOutputMW = 159 // measured: 200 kg/s at 165 bar and 50 mbar (design-basis.md)

describe("max-output", () => {
  // every tick, so the breaker opening can be pinned to one tick
  const samples = runScenario({ ...maxOutput, sampleEvery: CstSimulation.DeltaTime })
  const opened: number = samples.findIndex((s) => s.time > 1 && !s.state.Turbine.generatorBreaker)
  const carrying = samples.slice(0, opened)
  const before = samples[opened - 1].state
  const at = samples[opened].state
  const after = samples.slice(opened)

  test("the valve opens fully only above rated output", () => {
    const full = carrying.find((s) => s.state.Turbine.turbineValvePosition === 1)
    expect(full?.state.Turbine.electricOutput).toBeGreaterThan(ratedOutputMW)
  })

  test("the most the plant carries with the valve fully open is about 159 MW, and the gas is not the limit", () => {
    expect(before.Turbine.electricOutput).toBeCloseTo(MaxOutputMW, 0)
    expect(before.Turbine.turbineValvePosition).toBe(1)
    expect(before.Boiler.gasFlow).toBeLessThan(CstBoiler.MaxGasFlow)
  })

  test("pressure holds its band and the vacuum its limit while the load climbs", () => {
    for (const { state } of carrying) {
      expect(Math.abs(state.Boiler.pressure - PressureHoldSettings.Target)).toBeLessThanOrEqual(PressureHoldSettings.Band)
      expect(state.Condenser.pressure).toBeLessThan(CstCondenser.VacuumLimit)
    }
  })

  test("the breaker opens on the speed sag and the load and setpoint drop to 0 on that tick", () => {
    expect(at.Turbine.rpm).toBeLessThan(CstTurbine.SyncRPM - CstTurbine.BreakerRPMMargin)
    expect(at.Turbine.electricOutput).toBe(0)
    expect(at.Turbine.loadSetpoint).toBe(0)
  })

  test("after the load rejection Hold brings the speed back below the overspeed limit", () => {
    expect(Math.max(...after.map((s) => s.state.Turbine.rpm))).toBeLessThan(CstTurbine.MaxRPM)
    const end = samples[samples.length - 1].state
    expect(end.Turbine.speedMode).toBe("hold")
    expect(Math.abs(end.Turbine.rpm - CstTurbine.SyncRPM)).toBeLessThanOrEqual(CstTurbine.BreakerRPMMargin)
  })

  test("the steam the turbine no longer takes lifts the relief valve, which keeps pressure below design", () => {
    expect(before.Boiler.reliefLifts).toBe(0)
    expect(samples[samples.length - 1].state.Boiler.reliefLifts).toBeGreaterThan(0)
    expect(Math.max(...samples.map((s) => s.state.Boiler.pressure))).toBeLessThanOrEqual(CstBoiler.DesignPressure)
  })
})
