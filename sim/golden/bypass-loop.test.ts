import { describe, expect, test } from "vitest"
import { firstTimeWhere, runScenarioWithLifts } from "../scenario"
import { bypassLoop } from "../scenarios/bypass-loop"
import { LoopSettings } from "../scenarios/loop-operator"
import { PressureHoldSettings } from "../scenarios/pressure-hold"
import { StartGas } from "../scenarios/steps"
import { CstSimulation } from "../../src/context/const"
import { hotwellLevel } from "../../src/utils/condenserCalculation"
import { CondenserTick } from "../../src/context/Condenser/CondenserTick"
import { makeInitialState } from "../../src/context/PowerPlantReducer"
import PowerPlantState from "../../src/context/PowerPlantState"

// Loop assertions for the bypass loop; water conservation runs with the generic invariants.

const { CstBoiler, CstCondenser } = CstSimulation
const SteadyWindow = 600 // sim-seconds at the end of the run that count as steady
const SteadyShare = 0.05 // average steam out within this share of average steam generated
const OccasionalFraction = 0.1 // a valve open in at most this share of the steady samples

const { samples, lifts } = runScenarioWithLifts(bypassLoop)
const SettleTime = bypassLoop.duration - SteadyWindow
const valveOpenAt = firstTimeWhere(samples, (s) => s.Turbine.mainSteamValve) ?? Infinity
const steady = samples.filter((s) => s.time >= SettleTime)
const openShare = (open: (s: PowerPlantState) => boolean) =>
  steady.filter((s) => open(s.state)).length / steady.length

describe("bypass-loop setup", () => {
  const atOpen = samples.find((s) => s.time >= valveOpenAt)

  test("starts with the knob fully up and reaches full gas in one turn and one wait, without a jump", () => {
    expect(samples[0].state.Boiler.gasRateCommand).toBe(1)
    const full = samples.find((s) => s.state.Boiler.gasFlow >= CstBoiler.MaxGasFlow)
    expect(full?.time).toBeCloseTo(CstBoiler.MaxGasFlow / CstBoiler.GasRateMax, 0)
    for (let i = 1; i < samples.length; i++) {
      const step = samples[i].state.Boiler.gasFlow - samples[i - 1].state.Boiler.gasFlow
      expect(Math.abs(step)).toBeLessThanOrEqual(
        CstBoiler.GasRateMax * (samples[i].time - samples[i - 1].time) + 1e-6,
      )
    }
  })

  test("opens the main steam valve at working pressure, not during heat-up (ADR 0018)", () => {
    expect(valveOpenAt).toBeLessThan(SettleTime)
    expect(atOpen?.state.Boiler.gasFlow).toBeCloseTo(StartGas, 3)
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
    const out = average((s) => s.Turbine.bypassSteamFlowOut + s.Turbine.turbineSteamFlowOut + s.Deaerator.letDownFlow)
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

  test("makeup is only an occasional top-up", () => {
    expect(openShare((s) => s.Condenser.makeupValvePosition > 0)).toBeLessThanOrEqual(OccasionalFraction)
  })

  test("reject is only occasional: the loop creates no water to dump", () => {
    expect(openShare((s) => s.Condenser.rejectValvePosition > 0)).toBeLessThanOrEqual(OccasionalFraction)
  })
})
