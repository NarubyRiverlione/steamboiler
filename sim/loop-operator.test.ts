import { gasRateOf } from "../src/context/Boiler/BoilerTick"
import { describe, expect, it, test } from "vitest"
import { CstDeaerator, CstSimulation } from "../src/context/const"
import { getWaterSpecificVolume } from "../src/utils/steamTable"
import { hotwellValvePositions, loopOperator, LoopSettings } from "./scenarios/loop-operator"
import { holdPressureWithGas, PressureHoldSettings } from "./scenarios/pressure-hold"
import { StartGas } from "./scenarios/steps"
import { makeInitialState } from "../src/context/PowerPlantReducer"
import PowerPlantAction from "../src/context/PowerPlantActions"
import PowerPlantState from "../src/context/PowerPlantState"

const { HotwellBandLow, HotwellBandHigh } = LoopSettings
const { HotwellLowLow, HotwellHighHigh } = CstSimulation.CstCondenser
const { CstBoiler, CstCondenser, CstTurbine } = CstSimulation
const InBand = (LoopSettings.CondenserPressureLow + LoopSettings.CondenserPressureHigh) / 2

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
    Condenser: { ...cold.Condenser, pressure: InBand, ...patch }, // the condenser pressure inside the operator's band
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

  test("opens the deaerator start-up vent at t=0 on a vessel full of air, and nothing else at target levels (#120)", () => {
    expect(loopOperator(withCondenser({ hotwellWaterVolume: hotwellAt(0.7) }), 0)).toEqual([{ type: "TOGGLE_DEAERATOR_VENT" }])
  })

  test("closes the start-up vent once the safe-to-close lamp is lit, and never opens it later", () => {
    const air = { ...cold, Deaerator: { ...cold.Deaerator, startUpVentOpen: true } }
    expect(types(air, 5)).not.toContain("TOGGLE_DEAERATOR_VENT")
    const lit = { ...air, Deaerator: { ...air.Deaerator, safeToClose: true } }
    expect(types(lit, 5)).toContain("TOGGLE_DEAERATOR_VENT")
    const closed = { ...cold, Deaerator: { ...cold.Deaerator, startUpVentOpen: false } }
    expect(types(closed, 5)).not.toContain("TOGGLE_DEAERATOR_VENT")
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

  test("at working pressure: the knob already coming down, main steam valve open, bypass, SJAE and pump to their start positions", () => {
    const atPressure = withBoiler({
      pressure: PressureHoldSettings.Target - PressureHoldSettings.Band,
      gasFlow: CstBoiler.MaxGasFlow,
    })
    const state = {
      ...atPressure,
      Condenser: { ...atPressure.Condenser, hotwellWaterVolume: hotwellAt(0.7) },
    }
    expect(loopOperator(state, 0.5)).toEqual([
      { type: "SET_GAS_RATE", payload: { gasRateCommand: -1 } }, // full down, the gas ramps to the heat-up gas
      { type: "TOGGLE_MAIN_STEAM_VALVE" },
      { type: "ADJUST_STEAM_BYPASS_VALVE", payload: { bypassValvePosition: LoopSettings.BypassLoadOpening } },
      {
        type: "SET_RECIRCULATION_PUMP_VALVE_POSITION",
        payload: { recirculationPumpValvePosition: LoopSettings.CoolingWaterOpening },
      },
      {
        type: "SET_CONDENSATION_PUMP_VALVE_POSITION",
        payload: { condensationPumpValvePosition: LoopSettings.CondensationPumpOpening },
      },
      { type: "SET_FEED_PUMP_VALVE_POSITION", payload: { feedPumpValvePosition: LoopSettings.FeedPumpOpening } },
      { type: "SET_SJAE_ENABLED", payload: { isSjaeEnabled: true } },
      { type: "SET_SJAE_VALVE_POSITION", payload: { sjaeValvePosition: LoopSettings.SjaeOpening } },
    ])
  })

  test("gas lowers above the pressure band, raises below it and leans against the trend inside it, never above StartGas", () => {
    const { Target, Band, GasStep } = PressureHoldSettings
    const gas = (pressure: number, gasFlow: number, heatingRate = 0) => {
      const state = steaming({ pressure, gasFlow, heatingRate })
      const action = loopOperator(state, 0).find((a) => a.type === "SET_GAS_RATE")
      if (action === undefined) return 0
      // The knob command turns into the gas change over the adjustment interval
      return gasRateOf(action.payload.gasRateCommand) * PressureHoldSettings.AdjustEvery
    }
    expect(gas(Target + Band + 1, StartGas)).toBeCloseTo(-GasStep, 6)
    expect(gas(Target - Band - 1, 500)).toBeCloseTo(GasStep, 6)
    expect(gas(Target - Band - 1, StartGas)).toBe(0)
    expect(gas(Target + 1, 500, 0.01)).toBeCloseTo(-GasStep, 6)
    expect(gas(Target - 1, 500, -0.01)).toBeCloseTo(GasStep, 6)
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
    expect(types(cold, 1)).not.toContain("SET_GAS_RATE")
    expect(types(cold)).not.toContain("SET_CONDENSATION_PUMP_VALVE_POSITION")
    expect(types(cold)).not.toContain("ADJUST_STEAM_BYPASS_VALVE")
  })

  describe("feedforward feedwater control (#74, #112)", () => {
    const pump = (state: PowerPlantState): number | undefined =>
      (find(state, "SET_FEED_PUMP_VALVE_POSITION") as { payload: { feedPumpValvePosition: number } } | undefined)?.payload
        .feedPumpValvePosition
    const target = { pressure: PressureHoldSettings.Target }
    const atPump = (state: PowerPlantState, position: number): PowerPlantState => ({
      ...state,
      Deaerator: { ...state.Deaerator, feedPumpValvePosition: position },
    })

    test("a low level trims the feed pump open by the level gain", () => {
      expect(pump(steaming({ ...target, waterVolume: boilerAt(0.4) }))).toBeCloseTo(LoopSettings.LevelGain * 0.1)
    })

    test("a high level trims the feed pump shut, never below closed", () => {
      expect(pump(atPump(steaming({ ...target, waterVolume: boilerAt(0.6) }), 0.5))).toBeCloseTo(-0.5)
    })

    test("at target level the feed pump follows all the steam leaving the boiler, in litres at the deaerator temperature", () => {
      const flowing = steaming(
        { ...target, waterVolume: boilerAt(LoopSettings.BoilerLevelTarget) },
        { turbineSteamFlowOut: 120, bypassSteamFlowOut: 30 },
      )
      const withLetDown: PowerPlantState = { ...flowing, Deaerator: { ...flowing.Deaerator, letDownFlow: 10, temperature: 134 } }
      expect(pump(withLetDown)).toBeCloseTo((160 * getWaterSpecificVolume(134)) / CstCondenser.CondensationPump_MaxFlowRate)
    })

    test("does not re-open the feed pump while the high-high trip flag is set (#62)", () => {
      const tripped: PowerPlantState = steaming({ ...target, waterVolume: boilerAt(0.4), boilerLevelHighTripped: true })
      expect(pump(tripped)).toBeUndefined()
    })

    test("asks for nothing once the pump is where the control wants it", () => {
      const state = steaming({ ...target, waterVolume: boilerAt(LoopSettings.BoilerLevelTarget) })
      expect(pump(state)).toBeUndefined()
    })
  })

  describe("deaerator level feedback on the condensation pump (#112)", () => {
    const pump = (state: PowerPlantState): number | undefined =>
      (find(state, "SET_CONDENSATION_PUMP_VALVE_POSITION") as { payload: { condensationPumpValvePosition: number } } | undefined)
        ?.payload.condensationPumpValvePosition
    const target = { pressure: PressureHoldSettings.Target, waterVolume: boilerAt(LoopSettings.BoilerLevelTarget) }
    const deaerator = (
      level: number,
      deltaWaterMass = 0,
      position = 0.3,
    ): PowerPlantState => {
      const state = steaming(target)
      return {
        ...state,
        Deaerator: { ...state.Deaerator, waterVolume: level * CstDeaerator.TotalVolume, deltaWaterMass },
        Condenser: { ...state.Condenser, condensationPumpValvePosition: position },
      }
    }

    test("a low level opens the pump by the gain, a high level closes it", () => {
      expect(pump(deaerator(0.4))).toBeCloseTo(LoopSettings.DeaeratorLevelGain * 0.1 * LoopSettings.AdjustEvery)
      expect(pump(deaerator(0.6))).toBeCloseTo(-LoopSettings.DeaeratorLevelGain * 0.1 * LoopSettings.AdjustEvery)
    })

    test("a rising level damps it: the pump closes a little with the level at target", () => {
      expect(pump(deaerator(LoopSettings.DeaeratorLevelTarget, 5))).toBeLessThan(0)
    })

    test("does not follow the feed pump flow: at target and steady it asks for nothing whatever the feed pump does", () => {
      const state = deaerator(LoopSettings.DeaeratorLevelTarget)
      expect(pump(state)).toBeUndefined()
      expect(pump({ ...state, Deaerator: { ...state.Deaerator, feedPumpValvePosition: 0.9 } })).toBeUndefined()
    })

    test("holds nothing before the main steam valve opens", () => {
      const state = deaerator(0.4)
      // below working pressure, so the operator does not open the main steam valve (and the pumps) either
      expect(pump({ ...state, Boiler: { ...state.Boiler, pressure: 5 }, Turbine: { ...state.Turbine, mainSteamValve: false } })).toBeUndefined()
    })
  })

  test("adjusts gas and pumps only on whole seconds", () => {
    const low = steaming({
      pressure: PressureHoldSettings.Target + 10,
      gasFlow: StartGas,
      waterVolume: boilerAt(0.4),
    })
    expect(types(low, 0.5)).not.toContain("SET_FEED_PUMP_VALVE_POSITION")
    expect(types(low, 0.5)).not.toContain("SET_GAS_RATE")
    expect(types(low, 1)).toContain("SET_FEED_PUMP_VALVE_POSITION")
    expect(types(low, 1)).toContain("SET_GAS_RATE")
  })

  test("adds cooling water when the condenser pressure is high, and backs off when it is low, down to the minimum", () => {
    const cooling = (pressure: number, position: number) =>
      loopOperator(withCondenser({ pressure, recirculationPumpValvePosition: position }), 0).find(
        (a) => a.type === "SET_RECIRCULATION_PUMP_VALVE_POSITION",
      )
    expect(cooling(LoopSettings.CondenserPressureHigh + 1, 0.5)).toBeDefined()
    expect(cooling(LoopSettings.CondenserPressureLow - 1, 0.5)).toBeDefined()
    expect(cooling(LoopSettings.CondenserPressureLow - 1, LoopSettings.CoolingWaterMinimum)).toBeUndefined()
    expect(cooling(LoopSettings.CondenserPressureLow + 1, 0.5)).toBeUndefined()
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
      ).filter((a) => a.type !== "TOGGLE_DEAERATOR_VENT")
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
