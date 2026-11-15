import { describe, expect, test } from "vitest"
import { firstTimeWhere } from "../scenario"
import { runChecked } from "../scenario-checks"
import { bypassLoop } from "../scenarios/bypass-loop"
import { LoopSettings } from "../scenarios/loop-operator"
import { PressureHoldSettings } from "../scenarios/pressure-hold"
import { StartGas } from "../scenarios/steps"
import { CstDeaerator, CstSimulation } from "../../src/context/const"
import { getBoilingPoint } from "../../src/utils/steamTable"
import { hotwellLevel } from "../../src/utils/condenserCalculation"
import { CondenserTick } from "../../src/context/Condenser/CondenserTick"
import { makeInitialState } from "../../src/context/PowerPlantReducer"
import PowerPlantState from "../../src/context/PowerPlantState"

// Loop assertions for the bypass loop; water conservation runs with the generic invariants.

const { CstBoiler, CstCondenser } = CstSimulation
const SteadyWindow = 600 // sim-seconds at the end of the run that count as steady
const SteadyShare = 0.05 // average steam out within this share of average steam generated
const OccasionalFraction = 0.1 // a valve open in at most this share of the steady samples

// The one run of the scenario, every second: its invariants, its snapshot and the goal checks below
const { samples, lifts } = runChecked(bypassLoop, { sampleEvery: 1 })
const SettleTime = bypassLoop.duration - SteadyWindow
const valveOpenAt = firstTimeWhere(samples, (s) => s.Turbine.mainSteamValve) ?? Infinity
const steady = samples.filter((s) => s.time >= SettleTime)
const openShare = (open: (s: PowerPlantState) => boolean) =>
  steady.filter((s) => open(s.state)).length / steady.length

describe("bypass-loop setup", () => {
  const atOpen = samples.find((s) => s.time >= valveOpenAt)

  test("starts cold with the gas off and ramps it at the heating-rate limit, without a jump (#103)", () => {
    expect(samples[0].state.Boiler.gasFlow).toBe(0)
    expect(samples.some((s) => s.state.Boiler.gasFlow > 0)).toBe(true)
    for (let i = 1; i < samples.length; i++) {
      const step = samples[i].state.Boiler.gasFlow - samples[i - 1].state.Boiler.gasFlow
      expect(Math.abs(step)).toBeLessThanOrEqual(
        CstBoiler.GasRateMax * (samples[i].time - samples[i - 1].time) + 1e-6,
      )
    }
  })

  test("never raises the heating-rate alarm: the whole cold start runs under the real limit", () => {
    expect(samples.filter((s) => s.state.Boiler.heatingRateOverLimit).map((s) => s.time)).toEqual([])
  })

  test("opens the main steam valve at working pressure, not during heat-up (ADR 0018)", () => {
    expect(valveOpenAt).toBeLessThan(SettleTime)
    expect(atOpen?.state.Boiler.gasFlow).toBeLessThanOrEqual(StartGas)
    expect(atOpen?.state.Condenser.sjaeValvePosition).toBe(LoopSettings.SjaeOpening)
  })

  test("holds the bypass at its fixed load opening once the main steam valve opens", () => {
    for (const { state } of samples.filter((s) => s.time > valveOpenAt))
      expect(state.Turbine.bypassValvePosition).toBeCloseTo(LoopSettings.BypassLoadOpening, 9)
  })

  test("gas never goes above the heat-up gas once the main steam valve opens", () => {
    for (const { state } of samples.filter((s) => s.time > valveOpenAt))
      expect(state.Boiler.gasFlow).toBeLessThanOrEqual(StartGas + 1e-6)
  })

  test("keeps the turbine valve closed throughout", () => {
    for (const { state } of samples) expect(state.Turbine.turbineValvePosition).toBe(0)
  })
})

// Since #12 the boiler reaches 165 bar. With the water held in kg (#34) the loop no longer empties the hotwell or boils
// the boiler dry, and since #35 the condensate leaves at the condenser saturation temperature (docs/plant/feedwater-loop.md).
describe("bypass-loop assertions", () => {
  test("condensation pump never returns more than the hotwell holds", () => {
    const empty = makeInitialState().Condenser
    const pumping = { ...empty, hotwellWaterMass: 0, hotwellWaterVolume: 0, condensationPumpValvePosition: 1 }
    const next = CondenserTick(pumping, 1, { flow: 0, enthalpy: 0 }, { flow: 0, enthalpy: 0 }, CstBoiler.TotalVolume)
    expect(next.returnRate).toBe(0)
  })

  test("condensation pump returns nothing into a full boiler, the water stays in the hotwell", () => {
    const pumping = { ...makeInitialState().Condenser, condensationPumpValvePosition: 1 }
    const next = CondenserTick(pumping, 1, { flow: 0, enthalpy: 0 }, { flow: 0, enthalpy: 0 }, 0)
    expect(next.returnRate).toBe(0)
    expect(next.hotwellWaterMass).toBe(pumping.hotwellWaterMass)
  })

  test("hotwell neither runs dry nor overflows", () => {
    for (const { state } of samples) {
      expect(state.Condenser.hotwellWaterVolume).toBeGreaterThan(0)
      expect(state.Condenser.hotwellWaterVolume).toBeLessThanOrEqual(CstCondenser.TotalVolume)
    }
  })

  test("gas holds the working pressure within the band", () => {
    const { Target, Band } = PressureHoldSettings
    for (const { state } of steady) expect(Math.abs(state.Boiler.pressure - Target)).toBeLessThanOrEqual(Band)
  })

  test("the relief valve never lifts", () => {
    expect(lifts).toEqual([])
  })

  test("while holding, steam out of the boiler matches steam generated", () => {
    const average = (value: (s: PowerPlantState) => number) => steady.reduce((sum, s) => sum + value(s.state), 0) / steady.length
    const out = average((s) => s.Turbine.bypassSteamFlowOut + s.Turbine.turbineSteamFlowOut - s.Boiler.sprayFlow + s.Deaerator.letDownFlow)
    const generated = average((s) => s.Boiler.deltaSteamMass)
    expect(Math.abs(out - generated)).toBeLessThanOrEqual(SteadyShare * generated)
  })

  test("operator reaches a steady boiler level within the control band", () => {
    const { BoilerLevelTarget, BoilerLevelBand } = LoopSettings
    for (const { state } of steady) {
      const level = state.Boiler.waterVolume / CstBoiler.TotalVolume
      expect(Math.abs(level - BoilerLevelTarget)).toBeLessThanOrEqual(BoilerLevelBand)
    }
  })

  // With gas holding the pressure the loop is steady, so the hotwell level settles inside the working band (#52). The
  // proportional valves leave a small offset past an edge, hence the tolerance of a tenth of the ramp.
  test("hotwell level stays inside the working band once the loop is steady", () => {
    const { HotwellBandLow, HotwellBandHigh, HotwellRamp } = LoopSettings
    const tolerance = HotwellRamp / 10
    for (const { state } of steady) {
      const level = hotwellLevel(state.Condenser.hotwellWaterVolume)
      expect(level).toBeGreaterThanOrEqual(HotwellBandLow - tolerance)
      expect(level).toBeLessThanOrEqual(HotwellBandHigh + tolerance)
    }
  })

  test("makeup only covers the steam the deaerator's operating vent loses (#120)", () => {
    const [first, last] = [steady[0].state, steady[steady.length - 1].state]
    const made: number = last.Condenser.makeupTotal - first.Condenser.makeupTotal
    const lost: number = last.Deaerator.ventedTotal - first.Deaerator.ventedTotal
    expect(lost).toBeGreaterThan(0)
    expect(made).toBeLessThanOrEqual(lost * 1.5)
  })

  test("reject is only occasional: the loop creates no water to dump", () => {
    expect(openShare((s) => s.Condenser.rejectValvePosition > 0)).toBeLessThanOrEqual(OccasionalFraction)
  })
})

// The deaerator start-up vent opened and closed on time (#120, ADR 0038); the two mistakes are the edge scenarios
// deaerator-vent-closed and deaerator-vent-open
describe("bypass-loop deaerator vent opened and closed on time", () => {
  const SetTemperature: number = getBoilingPoint(CstDeaerator.Pressure)
  const firstTime = (condition: (s: (typeof samples)[number]) => boolean): number | undefined => samples.find(condition)?.time
  const lampAt: number = firstTime((s) => s.state.Deaerator.safeToClose) ?? Infinity

  test("the air is out when the lamp lights, long before the vessel is hot, and the operator closes the vent at once", () => {
    expect(lampAt).toBeLessThan(firstTime((s) => s.state.Deaerator.temperature >= SetTemperature - 1) ?? 0)
    const closedAt: number | undefined = firstTime((s) => s.time > 0 && !s.state.Deaerator.startUpVentOpen)
    expect(closedAt).toBeGreaterThanOrEqual(lampAt)
    expect(closedAt).toBeLessThanOrEqual(lampAt + 10)
  })

  test("the vessel heats to 133.5 °C and 3 bar with no relief lift and no warning once the vent is closed", () => {
    const hot = samples.filter((s) => s.time > lampAt + 20)
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
    const end: number = bypassLoop.duration - 10
    expect(at(end) - at(end - 600)).toBeLessThan(100)
    expect(at(end) - at(end - 600)).toBeGreaterThan(10)
  })
})
