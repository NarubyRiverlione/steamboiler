import { describe, expect, test } from "vitest"
import { firstTimeWhere, runScenario } from "./scenario"
import { bypassLoop } from "./scenarios/bypass-loop"
import { LoopSettings, loopOperator } from "./scenarios/loop-operator"
import { CstSimulation } from "../src/context/const"
import { CondenserTick } from "../src/context/Condenser/CondenserTick"
import { makeInitialState } from "../src/context/PowerPlantReducer"
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
  test("opens the main steam valve and the bypass once there is pressure", () => {
    expect(valveOpenAt).toBeLessThan(SettleTime)
    const after = samples.filter((s) => s.time > valveOpenAt)
    for (const { state } of after) expect(state.Turbine.bypassValvePosition).toBeCloseTo(LoopSettings.BypassOpening)
  })

  test("keeps the turbine valve closed throughout", () => {
    for (const { state } of samples) expect(state.Turbine.turbineValvePosition).toBe(0)
  })
})

describe("bypass-loop assertions", () => {
  test.fails("condensation pump never returns more than the hotwell holds (fails until #10)", () => {
    const empty = makeInitialState().Condenser
    const pumping = { ...empty, hotwellWaterVolume: 0, condensationPumpValvePosition: 1 }
    const next = CondenserTick(pumping, 1, { flow: 0, temp: 0 }, { flow: 0, temp: 0, pressure: 0 })
    expect(next.returnRate).toBe(0)
  })

  test("hotwell neither runs dry nor overflows", () => {
    for (const { state } of samples) {
      expect(state.Condenser.hotwellWaterVolume).toBeGreaterThan(0)
      expect(state.Condenser.hotwellWaterVolume).toBeLessThanOrEqual(CstCondenser.TotalVolume)
    }
  })

  test("boiler pressure holds with only the bypass open", () => {
    for (const { state } of samples.filter((s) => s.time > valveOpenAt))
      expect(state.Boiler.pressure).toBeGreaterThan(CstTurbine.MainSteamValveMinimumPressure)
  })

  test("operator reaches a steady boiler level within the control band", () => {
    const { BoilerLevelTarget, BoilerLevelBand } = LoopSettings
    for (const { state } of steady) {
      const level = state.Boiler.waterVolume / CstBoiler.TotalVolume
      expect(Math.abs(level - BoilerLevelTarget)).toBeLessThanOrEqual(BoilerLevelBand)
    }
  })

  test.fails("makeup is only an occasional top-up (fails until #10)", () => {
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

  test("does nothing to a cold plant at target levels", () => {
    expect(loopOperator(withCondenser({ hotwellWaterVolume: hotwellAt(0.7) }), 0)).toEqual([])
  })

  test("opens the main steam valve, the bypass and the SJAE once at pressure", () => {
    const atPressure = withBoiler({ pressure: CstTurbine.MainSteamValveMinimumPressure + 1 })
    expect(types({ ...atPressure, Condenser: { ...atPressure.Condenser, hotwellWaterVolume: hotwellAt(0.7) } })).toEqual(
      ["TOGGLE_MAIN_STEAM_VALVE", "SET_SJAE_ENABLED"],
    )
    const open = { ...atPressure, Turbine: { ...atPressure.Turbine, mainSteamValve: true } }
    expect(loopOperator(open, 0)).toContainEqual({
      type: "ADJUST_STEAM_BYPASS_VALVE",
      payload: { bypassValvePosition: LoopSettings.BypassOpening },
    })
  })

  test("opens the condensation pump below the level band and closes it above", () => {
    const pump = (state: PowerPlantState) => {
      const action = loopOperator(state, 0).find((a) => a.type === "SET_CONDENSATION_PUMP_VALVE_POSITION")
      return action?.payload.condensationPumpValvePosition
    }
    expect(pump(withBoiler({ waterVolume: boilerAt(0.4) }))).toBeCloseTo(LoopSettings.ValveNudge)
    const high = withBoiler({ waterVolume: boilerAt(0.6) })
    const running = { ...high, Condenser: { ...high.Condenser, condensationPumpValvePosition: 0.5 } }
    expect(pump(running)).toBeCloseTo(-LoopSettings.ValveNudge)
  })

  test("inside the band leans against the level trend", () => {
    const pump = (deltaWaterVolume: number, level: number) =>
      types(withBoiler({ waterVolume: boilerAt(level), deltaWaterVolume })).includes(
        "SET_CONDENSATION_PUMP_VALVE_POSITION",
      )
    expect(pump(-1, 0.49)).toBe(true)
    expect(pump(1, 0.49)).toBe(false)
  })

  test("adjusts pumps only on whole seconds", () => {
    const low = withBoiler({ waterVolume: boilerAt(0.4) })
    expect(types(low, 0.5)).not.toContain("SET_CONDENSATION_PUMP_VALVE_POSITION")
    expect(types(low, 1)).toContain("SET_CONDENSATION_PUMP_VALVE_POSITION")
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
