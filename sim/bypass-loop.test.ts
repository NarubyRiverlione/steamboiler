import { describe, expect, test } from "vitest"
import { firstTimeWhere, runScenario } from "./scenario"
import { bypassLoop } from "./scenarios/bypass-loop"
import { LoopSettings, loopOperator } from "./scenarios/loop-operator"
import { CstSimulation } from "../src/context/const"
import { CondenserTick } from "../src/context/Condenser/CondenserTick"
import { makeInitialState } from "../src/context/PowerPlantReducer"
import PowerPlantAction from "../src/context/PowerPlantActions"
import PowerPlantState from "../src/context/PowerPlantState"

// Loop assertions for the bypass loop; water conservation runs with the generic invariants.

const { CstBoiler, CstCondenser, CstTurbine } = CstSimulation
const SettleTime = 1800 // sim-seconds: the second half of the run counts as steady
const OccasionalFraction = 0.1 // a valve open in at most this share of the steady samples

const samples = runScenario(bypassLoop)
const valveOpenAt = firstTimeWhere(samples, (s) => s.Turbine.mainSteamValve) ?? Infinity
const steady = samples.filter((s) => s.time >= SettleTime)
const openShare = (open: (s: PowerPlantState) => boolean) =>
  steady.filter((s) => open(s.state)).length / steady.length

describe("bypass-loop setup", () => {
  const atOpen = samples.find((s) => s.time > valveOpenAt)

  test("starts at full gas", () => {
    expect(samples[0].state.Boiler.gasFlow).toBe(CstBoiler.MaxGasFlow)
  })

  test("opens the main steam valve once above main-steam-valve pressure", () => {
    expect(valveOpenAt).toBeLessThan(SettleTime)
    expect(atOpen?.state.Boiler.gasFlow).toBe(LoopSettings.SteamGasFlow)
    expect(atOpen?.state.Condenser.sjaeValvePosition).toBe(LoopSettings.SjaeOpening)
  })

  test("never closes the bypass below its start opening once steam flows", () => {
    for (const { state } of samples.filter((s) => s.time > valveOpenAt))
      expect(state.Turbine.bypassValvePosition).toBeGreaterThanOrEqual(LoopSettings.BypassOpening - 1e-9)
  })

  test("keeps the turbine valve closed throughout", () => {
    for (const { state } of samples) expect(state.Turbine.turbineValvePosition).toBe(0)
  })
})

// The boiler model breaks down above ~100 bar (water past saturation, no steam, pressure runs to
// NaN), so the run cannot reach the 165 bar operating pressure yet. These verify #22 and #12.
describe("bypass-loop assertions", () => {
  test("condensation pump never returns more than the hotwell holds", () => {
    const empty = makeInitialState().Condenser
    const pumping = { ...empty, hotwellWaterVolume: 0, condensationPumpValvePosition: 1 }
    const next = CondenserTick(pumping, 1, { flow: 0, temp: 0 }, { flow: 0, temp: 0, pressure: 0 }, CstBoiler.TotalVolume)
    expect(next.returnRate).toBe(0)
  })

  test("condensation pump returns nothing into a full boiler, the water stays in the hotwell", () => {
    const pumping = { ...makeInitialState().Condenser, condensationPumpValvePosition: 1 }
    const next = CondenserTick(pumping, 1, { flow: 0, temp: 0 }, { flow: 0, temp: 0, pressure: 0 }, 0)
    expect(next.returnRate).toBe(0)
    expect(next.hotwellWaterVolume).toBe(pumping.hotwellWaterVolume)
  })

  test.fails("hotwell neither runs dry nor overflows (fails until #22, #12)", () => {
    for (const { state } of samples) {
      expect(state.Condenser.hotwellWaterVolume).toBeGreaterThan(0)
      expect(state.Condenser.hotwellWaterVolume).toBeLessThanOrEqual(CstCondenser.TotalVolume)
    }
  })

  test.fails("bypass holds the operating pressure within the band (fails until #22, #12)", () => {
    const { BoilerPressureTarget, BoilerPressureBand } = LoopSettings
    for (const { state } of steady)
      expect(Math.abs(state.Boiler.pressure - BoilerPressureTarget)).toBeLessThanOrEqual(BoilerPressureBand)
  })

  test.fails("operator reaches a steady boiler level within the control band (fails until #22, #12)", () => {
    const { BoilerLevelTarget, BoilerLevelBand } = LoopSettings
    for (const { state } of steady) {
      const level = state.Boiler.waterVolume / CstBoiler.TotalVolume
      expect(Math.abs(level - BoilerLevelTarget)).toBeLessThanOrEqual(BoilerLevelBand)
    }
  })

  test.fails("makeup is only an occasional top-up (fails until #34)", () => {
    expect(openShare((s) => s.Condenser.makeupValvePosition > 0)).toBeLessThanOrEqual(OccasionalFraction)
  })

  test("reject is only occasional: the loop creates no water to dump", () => {
    expect(openShare((s) => s.Condenser.rejectValvePosition > 0)).toBeLessThanOrEqual(OccasionalFraction)
  })
})

describe("loopOperator", () => {
  const cold = makeInitialState()
  const withBoiler = (patch: Partial<PowerPlantState["Boiler"]>): PowerPlantState => ({
    ...cold,
    Boiler: { ...cold.Boiler, ...patch },
  })
  const withCondenser = (patch: Partial<PowerPlantState["Condenser"]>): PowerPlantState => ({
    ...cold,
    Condenser: { ...cold.Condenser, ...patch },
  })
  const types = (state: PowerPlantState, time = 0) => loopOperator(state, time).map((a) => a.type)
  const hotwellAt = (fraction: number) => fraction * CstCondenser.TotalVolume
  const boilerAt = (fraction: number) => fraction * CstBoiler.TotalVolume

  const steaming = (patch: Partial<PowerPlantState["Boiler"]>, turbine: Partial<PowerPlantState["Turbine"]> = {}) => {
    const state = withBoiler(patch)
    return { ...state, Turbine: { ...state.Turbine, mainSteamValve: true, bypassValvePosition: LoopSettings.BypassOpening, ...turbine } }
  }
  const find = (state: PowerPlantState, type: PowerPlantAction["type"]) => loopOperator(state, 0).find((a) => a.type === type)

  test("does nothing to a cold plant at target levels", () => {
    expect(loopOperator(withCondenser({ hotwellWaterVolume: hotwellAt(0.7) }), 0)).toEqual([])
  })

  test("above main-steam-valve pressure: gas down, main steam valve open, bypass, SJAE and pump to their start positions", () => {
    const atPressure = withBoiler({ pressure: CstTurbine.MainSteamValveMinimumPressure + 1, gasFlow: CstBoiler.MaxGasFlow })
    const state = { ...atPressure, Condenser: { ...atPressure.Condenser, hotwellWaterVolume: hotwellAt(0.7) } }
    expect(loopOperator(state, 0.5)).toEqual([
      { type: "DECREASE_GAS_FLOW", amount: CstBoiler.MaxGasFlow - LoopSettings.SteamGasFlow },
      { type: "TOGGLE_MAIN_STEAM_VALVE" },
      { type: "ADJUST_STEAM_BYPASS_VALVE", payload: { bypassValvePosition: LoopSettings.BypassOpening } },
      {
        type: "SET_CONDENSATION_PUMP_VALVE_POSITION",
        payload: { condensationPumpValvePosition: LoopSettings.CondensationPumpOpening },
      },
      { type: "SET_SJAE_ENABLED", payload: { isSjaeEnabled: true } },
      { type: "SET_SJAE_VALVE_POSITION", payload: { sjaeValvePosition: LoopSettings.SjaeOpening } },
    ])
  })

  test("the bypass opens above the pressure band, holds within it and closes below it, never under its start opening", () => {
    const { BoilerPressureTarget: target, BoilerPressureBand: band, ValveNudge } = LoopSettings
    const bypass = (pressure: number, position = 0.5) =>
      (find(steaming({ pressure }, { bypassValvePosition: position }), "ADJUST_STEAM_BYPASS_VALVE") as
        | { payload: { bypassValvePosition: number } }
        | undefined)?.payload.bypassValvePosition
    expect(bypass(target + band + 1)).toBeCloseTo(ValveNudge)
    expect(bypass(target)).toBeUndefined()
    expect(bypass(target - band - 1)).toBeCloseTo(-ValveNudge)
    expect(bypass(target - band - 1, LoopSettings.BypassOpening)).toBeUndefined()
  })

  test("leaves bypass and condensation pump alone before the main steam valve opens", () => {
    const cold = withBoiler({ waterVolume: boilerAt(0.4) })
    expect(types(cold)).not.toContain("SET_CONDENSATION_PUMP_VALVE_POSITION")
    expect(types(cold)).not.toContain("ADJUST_STEAM_BYPASS_VALVE")
  })

  test("opens the condensation pump below the level band and closes it above", () => {
    const pump = (state: PowerPlantState) =>
      (find(state, "SET_CONDENSATION_PUMP_VALVE_POSITION") as
        | { payload: { condensationPumpValvePosition: number } }
        | undefined)?.payload.condensationPumpValvePosition
    const target = { pressure: LoopSettings.BoilerPressureTarget }
    expect(pump(steaming({ ...target, waterVolume: boilerAt(0.4) }))).toBeCloseTo(LoopSettings.ValveNudge)
    const high = steaming({ ...target, waterVolume: boilerAt(0.6) })
    const running = { ...high, Condenser: { ...high.Condenser, condensationPumpValvePosition: 0.5 } }
    expect(pump(running)).toBeCloseTo(-LoopSettings.ValveNudge)
  })

  test("inside the band leans against the level trend", () => {
    const pump = (deltaWaterVolume: number, level: number) =>
      types(steaming({ pressure: LoopSettings.BoilerPressureTarget, waterVolume: boilerAt(level), deltaWaterVolume })).includes(
        "SET_CONDENSATION_PUMP_VALVE_POSITION",
      )
    expect(pump(-1, 0.49)).toBe(true)
    expect(pump(1, 0.49)).toBe(false)
  })

  test("adjusts bypass and pumps only on whole seconds", () => {
    const low = steaming({ pressure: LoopSettings.BoilerPressureTarget + 10, waterVolume: boilerAt(0.4) })
    expect(types(low, 0.5)).not.toContain("SET_CONDENSATION_PUMP_VALVE_POSITION")
    expect(types(low, 0.5)).not.toContain("ADJUST_STEAM_BYPASS_VALVE")
    expect(types(low, 1)).toContain("SET_CONDENSATION_PUMP_VALVE_POSITION")
    expect(types(low, 1)).toContain("ADJUST_STEAM_BYPASS_VALVE")
  })

  test("adds cooling water when steam collects in the condenser, and backs off when it is gone", () => {
    const cooling = (steamMass: number, position: number) =>
      loopOperator(withCondenser({ steamMass, recirculationPumpValvePosition: position }), 0).find(
        (a) => a.type === "SET_RECIRCULATION_PUMP_VALVE_POSITION",
      )
    expect(cooling(LoopSettings.CondenserSteamHigh + 1, 0)).toBeDefined()
    expect(cooling(0, 0.5)).toBeDefined()
    expect(cooling(0, 0)).toBeUndefined()
  })

  test("makeup below the low limit, reject above the high limit, both closed back at target", () => {
    const valves = (fraction: number, makeup = 0, reject = 0) =>
      types(withCondenser({ hotwellWaterVolume: hotwellAt(fraction), makeupValvePosition: makeup, rejectValvePosition: reject }))
    expect(valves(0.6)).toContain("SET_MAKEUP_VALVE_POSITION")
    expect(valves(0.8)).toContain("SET_REJECT_VALVE_POSITION")
    expect(valves(0.67, 1)).toEqual([]) // makeup keeps running until the target
    expect(valves(0.72, 1)).toContain("SET_MAKEUP_VALVE_POSITION")
    expect(valves(0.72, 0, 1)).toEqual([]) // reject keeps running until the target
    expect(valves(0.69, 0, 1)).toContain("SET_REJECT_VALVE_POSITION")
  })
})
