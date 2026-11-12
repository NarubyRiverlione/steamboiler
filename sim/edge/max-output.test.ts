import { describe, expect, test } from "vitest"
import { CstSimulation } from "../../src/context/const"
import { ratedOutputMW } from "../../src/utils/turbineCalculations"
import { runChecked } from "../scenario-checks"
import { maxOutput } from "../scenarios/max-output"
import { PressureHoldSettings } from "../scenarios/pressure-hold"

const { CstBoiler, CstCondenser, CstTurbine } = CstSimulation
const GasLimitMW = 138 // measured: full gas first reached at about 138 MW and 194 kg/s, at 165 bar, with the extraction heater (design-basis.md, #88)
const MaxOutputMW = 142 // measured: the load carried when the breaker opens, living off the boiler's stored heat

describe("max-output", () => {
  // every tick, so the breaker opening can be pinned to one tick
  const { samples } = runChecked(maxOutput, { sampleEvery: CstSimulation.DeltaTime })
  const opened: number = samples.findIndex((s) => s.time > 1 && !s.state.Turbine.generatorBreaker)
  const carrying = samples.slice(0, opened)
  const before = samples[opened - 1].state
  const at = samples[opened].state
  const after = samples.slice(opened)

  test("the valve opens fully only at the top of the output: past what full gas carries, near rated output", () => {
    const full = carrying.find((s) => s.state.Turbine.turbineValvePosition === 1)
    expect(full?.state.Turbine.electricOutput).toBeGreaterThan(GasLimitMW)
    expect(full?.state.Turbine.electricOutput).toBeGreaterThan(0.95 * ratedOutputMW)
  })

  test("the gas is the limit: full gas is reached before the valve is full, near the rated flow, and pressure then sags a little", () => {
    const fullGas = carrying.findIndex((s) => s.state.Boiler.gasFlow >= CstBoiler.MaxGasFlow)
    const fullValve = carrying.findIndex((s) => s.state.Turbine.turbineValvePosition === 1)
    expect(fullGas).toBeGreaterThan(0)
    expect(fullGas).toBeLessThan(fullValve)
    expect(carrying[fullGas].state.Turbine.electricOutput).toBeCloseTo(GasLimitMW, -1)
    // RatedSteamFlow is measured, so the test fails if the plant drifts from it (ADR 0030). The gas reaches full a few
    // seconds later than when it jumped (#15), with the load still climbing, so the flow is read about 1 kg/s higher
    expect(
      Math.abs(carrying[fullGas].state.Turbine.turbineSteamFlowOut - CstTurbine.RatedSteamFlow),
    ).toBeLessThan(3)
    expect(
      Math.abs(carrying[fullGas].state.Boiler.pressure - PressureHoldSettings.Target),
    ).toBeLessThanOrEqual(PressureHoldSettings.Band)
    // the sag is only a bar or two: the valve (200 kg/s) is nearly full at the rated flow (ADR 0031)
    expect(carrying[carrying.length - 1].state.Boiler.pressure).toBeLessThan(PressureHoldSettings.Target - 1)
  })

  test("the most the plant carries is the load when the valve is fully open and the pressure has sagged, about 142 MW", () => {
    expect(before.Turbine.electricOutput).toBeCloseTo(MaxOutputMW, -1)
    expect(before.Turbine.electricOutput).toBeGreaterThan(GasLimitMW)
    expect(before.Turbine.turbineValvePosition).toBe(1)
    expect(before.Boiler.gasFlow).toBe(CstBoiler.MaxGasFlow)
  })

  test("pressure holds its band until full gas, and the vacuum holds its limit while the load climbs", () => {
    const fullGas = carrying.findIndex((s) => s.state.Boiler.gasFlow >= CstBoiler.MaxGasFlow)
    // the let-down steam of the deaerator (up to 27 kg/s at partial load, #119) is a draw the gas hold does not see coming:
    // the pressure dips up to a bar (2.5 bar measured, at the start of the load climb) past the band while the gas catches up
    for (const { state } of carrying.slice(0, fullGas))
      expect(Math.abs(state.Boiler.pressure - PressureHoldSettings.Target)).toBeLessThanOrEqual(
        PressureHoldSettings.Band + 1,
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
