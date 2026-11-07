import { describe, expect, it, test } from "vitest"
import { CstSimulation } from "../src/context/const"
import { hotwellValvePositions, loopOperator, LoopSettings } from "./scenarios/loop-operator"
import { holdPressureWithGas, PressureHoldSettings } from "./scenarios/pressure-hold"
import { StartGas } from "./scenarios/steps"
import { makeInitialState } from "../src/context/PowerPlantReducer"
import PowerPlantAction from "../src/context/PowerPlantActions"
import PowerPlantState from "../src/context/PowerPlantState"

const { HotwellBandLow, HotwellBandHigh } = LoopSettings
const { HotwellLowLow, HotwellHighHigh } = CstSimulation.CstCondenser
const { CstBoiler, CstCondenser, CstTurbine } = CstSimulation

describe("hotwellValvePositions", () => {
  it("holds both valves shut anywhere in the band, edges included", () => {
    for (const level of [HotwellBandLow, 0.6, 0.65, 0.7, HotwellBandHigh])
      expect(hotwellValvePositions(level)).toEqual({ makeup: 0, reject: 0 })
  })

  it("ramps makeup linearly below the band, fully open 15 points below it", () => {
    expect(hotwellValvePositions(0.475).makeup).toBeCloseTo(0.5)
    expect(hotwellValvePositions(0.4).makeup).toBe(1)
    expect(hotwellValvePositions(0.2)).toEqual({ makeup: 1, reject: 0 })
  })

  it("ramps reject linearly above the band, fully open 15 points above it", () => {
    expect(hotwellValvePositions(0.825).reject).toBeCloseTo(0.5)
    expect(hotwellValvePositions(0.9).reject).toBe(1)
    expect(hotwellValvePositions(0.99)).toEqual({ makeup: 0, reject: 1 })
  })

  it("is fully open well before the protections act", () => {
    expect(hotwellValvePositions(HotwellLowLow + 0.25).makeup).toBe(1)
    expect(hotwellValvePositions(HotwellHighHigh - 0.04).reject).toBe(1)
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

  const steaming = (
    patch: Partial<PowerPlantState["Boiler"]>,
    turbine: Partial<PowerPlantState["Turbine"]> = {},
  ) => {
    const state = withBoiler(patch)
    return {
      ...state,
      Turbine: {
        ...state.Turbine,
        mainSteamValve: true,
        bypassValvePosition: LoopSettings.BypassLoadOpening,
        ...turbine,
      },
    }
  }
  const find = (state: PowerPlantState, type: PowerPlantAction["type"]) =>
    loopOperator(state, 0).find((a) => a.type === type)

  test("does nothing to a cold plant at target levels", () => {
    expect(loopOperator(withCondenser({ hotwellWaterVolume: hotwellAt(0.7) }), 0)).toEqual([])
  })

  test("between main-steam-valve pressure and working pressure: the main steam valve stays shut, only the SJAE restarts", () => {
    const heating = withBoiler({
      pressure: CstTurbine.MainSteamValveMinimumPressure + 1,
      gasFlow: CstBoiler.MaxGasFlow,
    })
    const state = { ...heating, Condenser: { ...heating.Condenser, hotwellWaterVolume: hotwellAt(0.7) } }
    expect(loopOperator(state, 0.5)).toEqual([
      { type: "SET_SJAE_ENABLED", payload: { isSjaeEnabled: true } },
      { type: "SET_SJAE_VALVE_POSITION", payload: { sjaeValvePosition: LoopSettings.SjaeOpening } },
    ])
  })

  test("at working pressure: gas down, main steam valve open, bypass, SJAE and pump to their start positions", () => {
    const atPressure = withBoiler({
      pressure: PressureHoldSettings.Target - PressureHoldSettings.Band,
      gasFlow: CstBoiler.MaxGasFlow,
    })
    const state = {
      ...atPressure,
      Condenser: { ...atPressure.Condenser, hotwellWaterVolume: hotwellAt(0.7) },
    }
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
      const action = loopOperator(state, 0).find(
        (a) => a.type === "INCREASE_GAS_FLOW" || a.type === "DECREASE_GAS_FLOW",
      )
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
    const state = steaming(
      { pressure: PressureHoldSettings.Target + 10 },
      { bypassValvePosition: LoopSettings.BypassLoadOpening },
    )
    expect(types(state)).not.toContain("ADJUST_STEAM_BYPASS_VALVE")
  })

  test("leaves gas hold, bypass and condensation pump alone before the main steam valve opens", () => {
    const cold = withBoiler({ waterVolume: boilerAt(0.4), pressure: 5, gasFlow: 500 })
    expect(types(cold, 1)).not.toContain("INCREASE_GAS_FLOW")
    expect(types(cold)).not.toContain("SET_CONDENSATION_PUMP_VALVE_POSITION")
    expect(types(cold)).not.toContain("ADJUST_STEAM_BYPASS_VALVE")
  })

  describe("feedforward feedwater control (#74)", () => {
    const pump = (state: PowerPlantState): number | undefined =>
      (
        find(state, "SET_CONDENSATION_PUMP_VALVE_POSITION") as
          { payload: { condensationPumpValvePosition: number } } | undefined
      )?.payload.condensationPumpValvePosition
    const target = { pressure: PressureHoldSettings.Target }
    const atPump = (state: PowerPlantState, position: number): PowerPlantState => ({
      ...state,
      Condenser: { ...state.Condenser, condensationPumpValvePosition: position },
    })

    test("a low level trims the pump open by the level gain", () => {
      expect(pump(steaming({ ...target, waterVolume: boilerAt(0.4) }))).toBeCloseTo(
        LoopSettings.LevelGain * 0.1,
      )
    })

    test("a high level trims the pump shut, never below closed", () => {
      expect(pump(atPump(steaming({ ...target, waterVolume: boilerAt(0.6) }), 0.5))).toBeCloseTo(-0.5)
    })

    test("at target level the pump follows the steam leaving the boiler", () => {
      const flowing = steaming(
        { ...target, waterVolume: boilerAt(LoopSettings.BoilerLevelTarget) },
        { turbineSteamFlowOut: 120, bypassSteamFlowOut: 30 },
      )
      expect(pump(flowing)).toBeCloseTo(150 / CstCondenser.CondensationPump_MaxFlowRate)
    })

    test("asks for nothing once the pump is where the control wants it", () => {
      const state = steaming({ ...target, waterVolume: boilerAt(LoopSettings.BoilerLevelTarget) })
      expect(pump(state)).toBeUndefined()
    })
  })

  test("adjusts gas and pumps only on whole seconds", () => {
    const low = steaming({
      pressure: PressureHoldSettings.Target + 10,
      gasFlow: StartGas,
      waterVolume: boilerAt(0.4),
    })
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
        withCondenser({
          hotwellWaterVolume: hotwellAt(fraction),
          makeupValvePosition: makeup,
          rejectValvePosition: reject,
        }),
        0,
      )
    const payloads = (fraction: number, makeup = 0, reject = 0): number[] =>
      valves(fraction, makeup, reject).flatMap((a) =>
        a.type === "SET_MAKEUP_VALVE_POSITION"
          ? [a.payload.makeupValvePosition]
          : a.type === "SET_REJECT_VALVE_POSITION"
            ? [a.payload.rejectValvePosition]
            : [],
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
