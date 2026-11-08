import { CstSimulation } from "../../src/context/const"
import PowerPlantAction from "../../src/context/PowerPlantActions"
import PowerPlantState from "../../src/context/PowerPlantState"
import { hotwellLevel } from "../../src/utils/condenserCalculation"
import { atWorkingPressure, holdPressureWithGas, PressureHoldSettings } from "./pressure-hold"
import { steerGas } from "./gas"
import { isAdjustTime, StartGas } from "./steps"

// An operator holding the closed water loop, decided from state alone (see docs/plant/feedwater-loop.md).
// Valve actions are deltas, so the operator asks for the difference to the position it wants.

const { CstBoiler, CstCondenser, CstTurbine } = CstSimulation

export const LoopSettings = {
  BypassLoadOpening: 0.1, // bypass position once the main steam valve opens: 20 kg/s, close to the turbine's ~18 kg/s at sync speed
  SjaeOpening: 1, // SJAE valve position once there is steam
  CoolingWaterMinimum: 0.1, // the cooling water never goes below it: a surge of steam (load rejection) must find the exchanger running
  CoolingWaterOpening: 0.1, // cooling water valve position when the main steam valve opens: the bypass steam has somewhere to condense at once
  CondensationPumpOpening: 0.1, // condensation pump position when the main steam valve opens
  BoilerLevelTarget: 0.5, // fraction of boiler capacity
  BoilerLevelBand: 0.05, // the level the scenarios judge the hold by: target ± band
  LevelGain: 1, // pump position per unit of level error: 0.05 of level trims 0.05 of the pump (15 L/s)
  HotwellBandLow: 0.55, // fraction of condenser capacity: makeup opens below the working band (normal level 70%)
  HotwellBandHigh: 0.75, // reject opens above the working band
  HotwellRamp: 0.15, // distance beyond a band edge at which makeup or reject is fully open
  CondenserPressureHigh: 33, // mbar condenser pressure: more cooling water (the design vacuum is 31 mbar)
  CondenserPressureLow: 28, // mbar: less cooling water
  GasBackOffPressure: 120, // bar: from here the knob goes down towards the heat-up gas, since the gas takes about 30 s to come back from full and the pressure rises 1 bar/s (#15)
  ValveNudge: 0.02, // position change per adjustment
  AdjustEvery: 1, // sim-seconds between gas, pump and cooling adjustments
}

const S = LoopSettings

// Nudge up, down or hold, never past 0..1
const nudge = (position: number, direction: -1 | 0 | 1) =>
  Math.max(0, Math.min(1, position + direction * S.ValveNudge)) - position

// Makeup and reject open in proportion to the distance outside the working band, shut inside it
export function hotwellValvePositions(level: number): { makeup: number; reject: number } {
  const ramp = (distance: number): number => Math.max(0, Math.min(1, distance / S.HotwellRamp))
  return { makeup: ramp(S.HotwellBandLow - level), reject: ramp(level - S.HotwellBandHigh) }
}

// Valve actions are deltas: ask for the difference to the wanted position, nothing when already there
const toPosition = (
  current: number,
  wanted: number,
  make: (delta: number) => PowerPlantAction,
): PowerPlantAction[] => (current === wanted ? [] : [make(wanted - current)])

// At pressure: main steam valve open, bypass and condensation pump to their start positions
function openMainSteam({ Turbine, Condenser }: PowerPlantState): PowerPlantAction[] {
  if (Turbine.mainSteamValve) return []
  return [
    { type: "TOGGLE_MAIN_STEAM_VALVE" },
    ...toPosition(Turbine.bypassValvePosition, S.BypassLoadOpening, (bypassValvePosition) => ({
      type: "ADJUST_STEAM_BYPASS_VALVE",
      payload: { bypassValvePosition },
    })),
    ...toPosition(
      Condenser.recirculationPumpValvePosition,
      S.CoolingWaterOpening,
      (recirculationPumpValvePosition) => ({
        type: "SET_RECIRCULATION_PUMP_VALVE_POSITION",
        payload: { recirculationPumpValvePosition },
      }),
    ),
    ...toPosition(
      Condenser.condensationPumpValvePosition,
      S.CondensationPumpOpening,
      (condensationPumpValvePosition) => ({
        type: "SET_CONDENSATION_PUMP_VALVE_POSITION",
        payload: { condensationPumpValvePosition },
      }),
    ),
  ]
}

// Before the main steam valve opens the operator already brings the gas back from full to the heat-up gas: the gas
// cannot jump, so the knob goes down early enough that working pressure is not overshot
function backOffGas({ Boiler, Turbine }: PowerPlantState): PowerPlantAction[] {
  if (Turbine.mainSteamValve || Boiler.pressure < S.GasBackOffPressure || Boiler.gasFlow <= StartGas)
    return []
  return steerGas(Boiler, StartGas, S.AdjustEvery)
}

// The SJAE trips below main-steam-valve pressure; restart it at its opening once there is steam
function restartSjae({ Condenser }: PowerPlantState): PowerPlantAction[] {
  return [
    ...(Condenser.isSjaeEnabled
      ? []
      : [{ type: "SET_SJAE_ENABLED", payload: { isSjaeEnabled: true } } as const]),
    ...toPosition(Condenser.sjaeValvePosition, S.SjaeOpening, (sjaeValvePosition) => ({
      type: "SET_SJAE_VALVE_POSITION",
      payload: { sjaeValvePosition },
    })),
  ]
}

// The SJAE restarts at main-steam-valve pressure (motive steam from the boiler); the main steam valve itself stays shut
// until working pressure, so the expanding water is not fed back up during heat-up (ADR 0018)
function startSteam(state: PowerPlantState): PowerPlantAction[] {
  if (state.Boiler.pressure <= CstTurbine.MainSteamValveMinimumPressure) return []
  return [
    ...backOffGas(state),
    ...(atWorkingPressure(state.Boiler.pressure) ? openMainSteam(state) : []),
    ...restartSjae(state),
  ]
}

// Feedforward feedwater control (#74): the Return costs heat, so the pump follows the steam leaving the boiler and the
// level only trims it. The pump position that returns the steam flow, plus LevelGain per unit of level error. The steam
// the heater takes comes back as its drain, not through the pump (#88), so the pump returns the rest.
function holdBoilerLevel({ Boiler, Condenser, Heater, Turbine }: PowerPlantState): PowerPlantAction[] {
  if (!Turbine.mainSteamValve) return []
  const level = Boiler.waterVolume / CstBoiler.TotalVolume
  const steamOut = Turbine.turbineSteamFlowOut + Turbine.bypassSteamFlowOut - Heater.extractionFlow
  const feedforward = steamOut / CstCondenser.CondensationPump_MaxFlowRate
  const wanted = Math.max(0, Math.min(1, feedforward + S.LevelGain * (S.BoilerLevelTarget - level)))
  return toPosition(Condenser.condensationPumpValvePosition, wanted, (condensationPumpValvePosition) => ({
    type: "SET_CONDENSATION_PUMP_VALVE_POSITION",
    payload: { condensationPumpValvePosition },
  }))
}

function holdCondensing({ Condenser }: PowerPlantState): PowerPlantAction[] {
  const direction =
    Condenser.pressure > S.CondenserPressureHigh ? 1 : Condenser.pressure < S.CondenserPressureLow ? -1 : 0
  const position = Condenser.recirculationPumpValvePosition
  const delta = direction < 0 && position <= S.CoolingWaterMinimum ? 0 : nudge(position, direction)
  return delta === 0
    ? []
    : [{ type: "SET_RECIRCULATION_PUMP_VALVE_POSITION", payload: { recirculationPumpValvePosition: delta } }]
}

function holdHotwell({ Condenser }: PowerPlantState): PowerPlantAction[] {
  const { makeup, reject } = hotwellValvePositions(hotwellLevel(Condenser.hotwellWaterVolume))
  return [
    ...toPosition(Condenser.makeupValvePosition, makeup, (makeupValvePosition) => ({
      type: "SET_MAKEUP_VALVE_POSITION",
      payload: { makeupValvePosition },
    })),
    ...toPosition(Condenser.rejectValvePosition, reject, (rejectValvePosition) => ({
      type: "SET_REJECT_VALVE_POSITION",
      payload: { rejectValvePosition },
    })),
  ]
}

// The holds once steam flows: hotwell every tick, gas, boiler level and cooling water every AdjustEvery seconds.
// `holdLevel` false leaves the boiler level hold out (turbine-runup before working pressure, ADR 0018).
// `gasCeiling` lifts the gas limit above the heat-up gas for a plant that carries load (turbine-load, #71).
export function holdLoop(
  state: PowerPlantState,
  time: number,
  holdLevel = true,
  gasCeiling: number = PressureHoldSettings.GasCeiling,
): PowerPlantAction[] {
  const adjustNow = isAdjustTime(time, S.AdjustEvery)
  const gas = state.Turbine.mainSteamValve ? holdPressureWithGas(state, gasCeiling) : []
  const level = holdLevel ? holdBoilerLevel(state) : []
  return [...holdHotwell(state), ...(adjustNow ? [...gas, ...level, ...holdCondensing(state)] : [])]
}

export function loopOperator(state: PowerPlantState, time: number): PowerPlantAction[] {
  return [...startSteam(state), ...holdLoop(state, time)]
}

// The loop operator with its hotwell hold taken away, for edge scenarios that force makeup and reject themselves
export function loopOperatorWithoutHotwellHold(state: PowerPlantState, time: number): PowerPlantAction[] {
  return loopOperator(state, time).filter(
    (a) => a.type !== "SET_MAKEUP_VALVE_POSITION" && a.type !== "SET_REJECT_VALVE_POSITION",
  )
}
