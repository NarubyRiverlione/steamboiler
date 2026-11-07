import { describe, expect, test } from "vitest"
import { CstSimulation } from "../../src/context/const"
import { ratedOutputMW } from "../../src/utils/turbineCalculations"
import { runScenario } from "../scenario"
import { maxOutput } from "../scenarios/max-output"
import { PressureHoldSettings } from "../scenarios/pressure-hold"

const { CstBoiler, CstCondenser, CstTurbine } = CstSimulation
const GasLimitMW = 130 // measured: full gas first reached at about 130 MW and 160 kg/s, at 165 bar (design-basis.md, #74)
const MaxOutputMW = 142 // measured: the load carried when the breaker opens, 172 kg/s at 147 bar, living off the boiler's stored heat

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

  test("the gas is the limit: full gas is reached before the valve is full, near the rated flow, and pressure then sags", () => {
    const fullGas = carrying.findIndex((s) => s.state.Boiler.gasFlow >= CstBoiler.MaxGasFlow)
    const fullValve = carrying.findIndex((s) => s.state.Turbine.turbineValvePosition === 1)
    expect(fullGas).toBeGreaterThan(0)
    expect(fullGas).toBeLessThan(fullValve)
    expect(carrying[fullGas].state.Turbine.electricOutput).toBeCloseTo(GasLimitMW, -1)
    // RatedSteamFlow is measured, so the test fails if the plant drifts from it (ADR 0030)
    expect(
      Math.abs(carrying[fullGas].state.Turbine.turbineSteamFlowOut - CstTurbine.RatedSteamFlow),
    ).toBeLessThan(2)
    expect(
      Math.abs(carrying[fullGas].state.Boiler.pressure - PressureHoldSettings.Target),
    ).toBeLessThanOrEqual(PressureHoldSettings.Band)
    expect(carrying[carrying.length - 1].state.Boiler.pressure).toBeLessThan(
      PressureHoldSettings.Target - PressureHoldSettings.Band,
    )
  })

  test("the most the plant carries is the load when the valve is fully open and the pressure has sagged, about 142 MW", () => {
    expect(before.Turbine.electricOutput).toBeCloseTo(MaxOutputMW, -1)
    expect(before.Turbine.electricOutput).toBeGreaterThan(GasLimitMW)
    expect(before.Turbine.turbineValvePosition).toBe(1)
    expect(before.Boiler.gasFlow).toBe(CstBoiler.MaxGasFlow)
  })

  test("pressure holds its band until full gas, and the vacuum holds its limit while the load climbs", () => {
    const fullGas = carrying.findIndex((s) => s.state.Boiler.gasFlow >= CstBoiler.MaxGasFlow)
    for (const { state } of carrying.slice(0, fullGas))
      expect(Math.abs(state.Boiler.pressure - PressureHoldSettings.Target)).toBeLessThanOrEqual(
        PressureHoldSettings.Band,
      )
    for (const { state } of carrying) expect(state.Condenser.pressure).toBeLessThan(CstCondenser.VacuumLimit)
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
    expect(Math.max(...samples.map((s) => s.state.Boiler.pressure))).toBeLessThanOrEqual(
      CstBoiler.DesignPressure,
    )
  })
})
