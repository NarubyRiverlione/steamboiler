import { describe, expect, test } from "vitest"
import { firstTimeWhere, runScenarioWithLifts } from "./scenario"
import { bypassLoop } from "./scenarios/bypass-loop"
import { LoopSettings, loopOperator } from "./scenarios/loop-operator"
import { holdPressureWithGas, PressureHoldSettings } from "./scenarios/pressure-hold"
import { StartGas } from "./scenarios/steps"
import { CstSimulation } from "../src/context/const"
import { CondenserTick } from "../src/context/Condenser/CondenserTick"
import { makeInitialState } from "../src/context/PowerPlantReducer"
import PowerPlantAction from "../src/context/PowerPlantActions"
import PowerPlantState from "../src/context/PowerPlantState"

// Loop assertions for the bypass loop; water conservation runs with the generic invariants.

const { CstBoiler, CstCondenser, CstTurbine } = CstSimulation
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
  const atOpen = samples.find((s) => s.time > valveOpenAt)

  test("starts at full gas", () => {
    expect(samples[0].state.Boiler.gasFlow).toBe(CstBoiler.MaxGasFlow)
  })

  test("opens the main steam valve once above main-steam-valve pressure", () => {
    expect(valveOpenAt).toBeLessThan(SettleTime)
    expect(atOpen?.state.Boiler.gasFlow).toBe(StartGas)
    expect(atOpen?.state.Condenser.sjaeValvePosition).toBe(LoopSettings.SjaeOpening)
  })

  test("holds the bypass at its fixed load opening once the main steam valve opens", () => {
    for (const { state } of samples.filter((s) => s.time > valveOpenAt))
      expect(state.Turbine.bypassValvePosition).toBeCloseTo(LoopSettings.BypassLoadOpening, 9)
  })

  test("gas never goes above the heat-up gas once the main steam valve opens", () => {
    for (const { state } of samples.filter((s) => s.time > valveOpenAt))
      expect(state.Boiler.gasFlow).toBeLessThanOrEqual(StartGas)
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
    const next = CondenserTick(pumping, 1, { flow: 0, temp: 0 }, { flow: 0, temp: 0, pressure: 0 }, CstBoiler.TotalVolume)
    expect(next.returnRate).toBe(0)
  })

  test("condensation pump returns nothing into a full boiler, the water stays in the hotwell", () => {
    const pumping = { ...makeInitialState().Condenser, condensationPumpValvePosition: 1 }
    const next = CondenserTick(pumping, 1, { flow: 0, temp: 0 }, { flow: 0, temp: 0, pressure: 0 }, 0)
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
    const out = average((s) => s.Turbine.bypassSteamFlowOut + s.Turbine.turbineSteamFlowOut)
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

  // With gas holding the pressure the loop is steady, so the hotwell level settles between the makeup and reject limits
  // (#52 stays open for the thresholds; the 50 m³ hotwell is #53)
  test("makeup is only an occasional top-up", () => {
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
    return { ...state, Turbine: { ...state.Turbine, mainSteamValve: true, bypassValvePosition: LoopSettings.BypassLoadOpening, ...turbine } }
  }
  const find = (state: PowerPlantState, type: PowerPlantAction["type"]) => loopOperator(state, 0).find((a) => a.type === type)

  test("does nothing to a cold plant at target levels", () => {
    expect(loopOperator(withCondenser({ hotwellWaterVolume: hotwellAt(0.7) }), 0)).toEqual([])
  })

  test("above main-steam-valve pressure: gas down, main steam valve open, bypass, SJAE and pump to their start positions", () => {
    const atPressure = withBoiler({ pressure: CstTurbine.MainSteamValveMinimumPressure + 1, gasFlow: CstBoiler.MaxGasFlow })
    const state = { ...atPressure, Condenser: { ...atPressure.Condenser, hotwellWaterVolume: hotwellAt(0.7) } }
    expect(loopOperator(state, 0.5)).toEqual([
      { type: "DECREASE_GAS_FLOW", amount: CstBoiler.MaxGasFlow - StartGas },
      { type: "TOGGLE_MAIN_STEAM_VALVE" },
      { type: "ADJUST_STEAM_BYPASS_VALVE", payload: { bypassValvePosition: LoopSettings.BypassLoadOpening } },
      {
        type: "SET_CONDENSATION_PUMP_VALVE_POSITION",
        payload: { condensationPumpValvePosition: LoopSettings.CondensationPumpOpening },
      },
      { type: "SET_SJAE_ENABLED", payload: { isSjaeEnabled: true } },
      { type: "SET_SJAE_VALVE_POSITION", payload: { sjaeValvePosition: LoopSettings.SjaeOpening } },
    ])
  })

  test("gas lowers above the pressure band, raises below it and leans against the trend inside it, never above StartGas", () => {
    const { Target, Band, GasStep } = PressureHoldSettings
    const gas = (pressure: number, gasFlow: number, heatingRate = 0) => {
      const state = steaming({ pressure, gasFlow, heatingRate })
      const action = loopOperator(state, 0).find((a) => a.type === "INCREASE_GAS_FLOW" || a.type === "DECREASE_GAS_FLOW")
      if (action === undefined) return 0
      return action.type === "INCREASE_GAS_FLOW" ? action.amount : -action.amount
    }
    expect(gas(Target + Band + 1, StartGas)).toBe(-GasStep)
    expect(gas(Target - Band - 1, 500)).toBe(GasStep)
    expect(gas(Target - Band - 1, StartGas)).toBe(0)
    expect(gas(Target + 1, 500, 0.01)).toBe(-GasStep)
    expect(gas(Target - 1, 500, -0.01)).toBe(GasStep)
    expect(gas(Target + 1, 500, -0.01)).toBe(0)
    expect(holdPressureWithGas(steaming({ pressure: Target, gasFlow: 500 }))).toEqual([])
  })

  test("never moves the bypass after the main steam valve opens", () => {
    const state = steaming({ pressure: PressureHoldSettings.Target + 10 }, { bypassValvePosition: LoopSettings.BypassLoadOpening })
    expect(types(state)).not.toContain("ADJUST_STEAM_BYPASS_VALVE")
  })

  test("leaves gas hold, bypass and condensation pump alone before the main steam valve opens", () => {
    const cold = withBoiler({ waterVolume: boilerAt(0.4), pressure: 5, gasFlow: 500 })
    expect(types(cold, 1)).not.toContain("INCREASE_GAS_FLOW")
    expect(types(cold)).not.toContain("SET_CONDENSATION_PUMP_VALVE_POSITION")
    expect(types(cold)).not.toContain("ADJUST_STEAM_BYPASS_VALVE")
  })

  test("opens the condensation pump below the level band and closes it above", () => {
    const pump = (state: PowerPlantState) =>
      (find(state, "SET_CONDENSATION_PUMP_VALVE_POSITION") as
        | { payload: { condensationPumpValvePosition: number } }
        | undefined)?.payload.condensationPumpValvePosition
    const target = { pressure: PressureHoldSettings.Target }
    expect(pump(steaming({ ...target, waterVolume: boilerAt(0.4) }))).toBeCloseTo(LoopSettings.ValveNudge)
    const high = steaming({ ...target, waterVolume: boilerAt(0.6) })
    const running = { ...high, Condenser: { ...high.Condenser, condensationPumpValvePosition: 0.5 } }
    expect(pump(running)).toBeCloseTo(-LoopSettings.ValveNudge)
  })

  test("inside the band leans against the level trend", () => {
    const pump = (deltaWaterMass: number, level: number) =>
      types(steaming({ pressure: PressureHoldSettings.Target, waterVolume: boilerAt(level), deltaWaterMass })).includes(
        "SET_CONDENSATION_PUMP_VALVE_POSITION",
      )
    expect(pump(-1, 0.49)).toBe(true)
    expect(pump(1, 0.49)).toBe(false)
  })

  test("adjusts gas and pumps only on whole seconds", () => {
    const low = steaming({ pressure: PressureHoldSettings.Target + 10, gasFlow: StartGas, waterVolume: boilerAt(0.4) })
    expect(types(low, 0.5)).not.toContain("SET_CONDENSATION_PUMP_VALVE_POSITION")
    expect(types(low, 0.5)).not.toContain("DECREASE_GAS_FLOW")
    expect(types(low, 1)).toContain("SET_CONDENSATION_PUMP_VALVE_POSITION")
    expect(types(low, 1)).toContain("DECREASE_GAS_FLOW")
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

  test("makeup and reject ramp with the distance outside the band and shut inside it", () => {
    const valves = (fraction: number, makeup = 0, reject = 0) =>
      loopOperator(
        withCondenser({ hotwellWaterVolume: hotwellAt(fraction), makeupValvePosition: makeup, rejectValvePosition: reject }),
        0,
      )
    const payloads = (fraction: number, makeup = 0, reject = 0) =>
      valves(fraction, makeup, reject).map((a) =>
        a.type === "SET_MAKEUP_VALVE_POSITION"
          ? a.payload.makeupValvePosition
          : a.type === "SET_REJECT_VALVE_POSITION"
            ? a.payload.rejectValvePosition
            : NaN,
      )
    expect(valves(0.65)).toEqual([])
    expect(valves(0.475)[0].type).toBe("SET_MAKEUP_VALVE_POSITION")
    expect(payloads(0.475)[0]).toBeCloseTo(0.5)
    expect(valves(0.825)[0].type).toBe("SET_REJECT_VALVE_POSITION")
    expect(payloads(0.825)[0]).toBeCloseTo(0.5)
    expect(payloads(0.65, 0.5)).toEqual([-0.5])
    expect(valves(0.65, 0, 0.5)[0].type).toBe("SET_REJECT_VALVE_POSITION")
    expect(payloads(0.65, 0, 0.5)).toEqual([-0.5])
  })
})
