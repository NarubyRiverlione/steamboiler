import { CstSimulation } from "../../src/context/const"
import PowerPlantAction from "../../src/context/PowerPlantActions"
import PowerPlantState from "../../src/context/PowerPlantState"
import { hotwellLevel } from "../../src/utils/condenserCalculation"
import { bandDirection } from "./band"
import { holdPressureWithGas } from "./pressure-hold"
import { isAdjustTime, StartGas } from "./steps"

// An operator holding the closed water loop, decided from state alone (see docs/plant/feedwater-loop.md).
// Valve actions are deltas, so the operator asks for the difference to the position it wants.

const { CstBoiler, CstTurbine } = CstSimulation

export const LoopSettings = {
  BypassLoadOpening: 0.1, // bypass position once the main steam valve opens: 20 kg/s, close to the turbine's ~18 kg/s at sync speed
  SjaeOpening: 1, // SJAE valve position once there is steam
  CondensationPumpOpening: 0.1, // condensation pump position when the main steam valve opens
  BoilerLevelTarget: 0.5, // fraction of boiler capacity
  BoilerLevelBand: 0.05, // no pump change within target ± band
  HotwellBandLow: 0.55, // fraction of condenser capacity: makeup opens below the working band (centre 65%)
  HotwellBandHigh: 0.75, // reject opens above the working band
  HotwellRamp: 0.15, // distance beyond a band edge at which makeup or reject is fully open
  CondenserSteamHigh: 100, // kg in the condenser: more cooling water
  CondenserSteamLow: 10, // kg: less cooling water
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
const toPosition = (current: number, wanted: number, make: (delta: number) => PowerPlantAction): PowerPlantAction[] =>
  current === wanted ? [] : [make(wanted - current)]

// At pressure: gas down to the heat-up gas, main steam valve open, bypass and condensation pump to their start positions
function openMainSteam({ Boiler, Turbine, Condenser }: PowerPlantState): PowerPlantAction[] {
  if (Turbine.mainSteamValve) return []
  const gasDown = Boiler.gasFlow - StartGas
  return [
    ...(gasDown > 0 ? [{ type: "DECREASE_GAS_FLOW", amount: gasDown } as const] : []),
    { type: "TOGGLE_MAIN_STEAM_VALVE" },
    ...toPosition(Turbine.bypassValvePosition, S.BypassLoadOpening, (bypassValvePosition) => ({
      type: "ADJUST_STEAM_BYPASS_VALVE",
      payload: { bypassValvePosition },
    })),
    ...toPosition(Condenser.condensationPumpValvePosition, S.CondensationPumpOpening, (condensationPumpValvePosition) => ({
      type: "SET_CONDENSATION_PUMP_VALVE_POSITION",
      payload: { condensationPumpValvePosition },
    })),
  ]
}

// The SJAE trips below main-steam-valve pressure; restart it at its opening once there is steam
function restartSjae({ Condenser }: PowerPlantState): PowerPlantAction[] {
  return [
    ...(Condenser.isSjaeEnabled ? [] : [{ type: "SET_SJAE_ENABLED", payload: { isSjaeEnabled: true } } as const]),
    ...toPosition(Condenser.sjaeValvePosition, S.SjaeOpening, (sjaeValvePosition) => ({
      type: "SET_SJAE_VALVE_POSITION",
      payload: { sjaeValvePosition },
    })),
  ]
}

function startSteam(state: PowerPlantState): PowerPlantAction[] {
  if (state.Boiler.pressure <= CstTurbine.MainSteamValveMinimumPressure) return []
  return [...openMainSteam(state), ...restartSjae(state)]
}

function holdBoilerLevel({ Boiler, Condenser, Turbine }: PowerPlantState): PowerPlantAction[] {
  if (!Turbine.mainSteamValve) return []
  const level = Boiler.waterVolume / CstBoiler.TotalVolume
  const direction = bandDirection(level - S.BoilerLevelTarget, S.BoilerLevelBand, Boiler.deltaWaterMass)
  const delta = nudge(Condenser.condensationPumpValvePosition, direction)
  return delta === 0
    ? []
    : [{ type: "SET_CONDENSATION_PUMP_VALVE_POSITION", payload: { condensationPumpValvePosition: delta } }]
}

function holdCondensing({ Condenser }: PowerPlantState): PowerPlantAction[] {
  const direction =
    Condenser.steamMass > S.CondenserSteamHigh ? 1 : Condenser.steamMass < S.CondenserSteamLow ? -1 : 0
  const delta = nudge(Condenser.recirculationPumpValvePosition, direction)
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

// The holds once steam flows: hotwell every tick, gas, boiler level and cooling water every AdjustEvery seconds
export function holdLoop(state: PowerPlantState, time: number): PowerPlantAction[] {
  const adjustNow = isAdjustTime(time, S.AdjustEvery)
  const gas = state.Turbine.mainSteamValve ? holdPressureWithGas(state) : []
  return [...holdHotwell(state), ...(adjustNow ? [...gas, ...holdBoilerLevel(state), ...holdCondensing(state)] : [])]
}

export function loopOperator(state: PowerPlantState, time: number): PowerPlantAction[] {
  return [...startSteam(state), ...holdLoop(state, time)]
}
