import { CstSimulation } from "../../src/context/const"
import PowerPlantAction from "../../src/context/PowerPlantActions"
import PowerPlantState from "../../src/context/PowerPlantState"
import { bandDirection, holdPressureWithGas } from "./pressure-hold"
import { isAdjustTime, StartGas } from "./steps"

// An operator holding the closed water loop, decided from state alone (see docs/plant/feedwater-loop.md).
// Valve actions are deltas, so the operator asks for the difference to the position it wants.

const { CstBoiler, CstCondenser, CstTurbine } = CstSimulation

export const LoopSettings = {
  BypassLoadOpening: 0.1, // bypass position once the main steam valve opens: 20 kg/s, close to the turbine's ~18 kg/s at sync speed
  SjaeOpening: 1, // SJAE valve position once there is steam
  CondensationPumpOpening: 0.1, // condensation pump position when the main steam valve opens
  BoilerLevelTarget: 0.5, // fraction of boiler capacity
  BoilerLevelBand: 0.05, // no pump change within target ± band
  HotwellMakeupBelow: 0.65, // fraction of condenser capacity: open makeup
  HotwellTarget: 0.7, // close makeup / reject once back here
  HotwellRejectAbove: 0.75, // open reject
  CondenserSteamHigh: 100, // kg in the condenser: more cooling water
  CondenserSteamLow: 10, // kg: less cooling water
  ValveNudge: 0.01, // position change per adjustment
  AdjustEvery: 1, // sim-seconds between gas, pump and cooling adjustments
}

const S = LoopSettings

// Nudge up, down or hold, never past 0..1
const nudge = (position: number, direction: -1 | 0 | 1) =>
  Math.max(0, Math.min(1, position + direction * S.ValveNudge)) - position

// Open past `limit`, close once back at `target`, else keep: a valve with hysteresis.
// `side` is -1 for a low limit (makeup) and +1 for a high limit (reject).
function hysteresis(open: boolean, level: number, limit: number, target: number, side: -1 | 1): boolean {
  if ((level - limit) * side > 0) return true
  if ((level - target) * side <= 0) return false
  return open
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

export function holdBoilerLevel({ Boiler, Condenser, Turbine }: PowerPlantState): PowerPlantAction[] {
  if (!Turbine.mainSteamValve) return []
  const level = Boiler.waterVolume / CstBoiler.TotalVolume
  const direction = bandDirection(level - S.BoilerLevelTarget, S.BoilerLevelBand, Boiler.deltaWaterMass)
  const delta = nudge(Condenser.condensationPumpValvePosition, direction)
  return delta === 0
    ? []
    : [{ type: "SET_CONDENSATION_PUMP_VALVE_POSITION", payload: { condensationPumpValvePosition: delta } }]
}

export function holdCondensing({ Condenser }: PowerPlantState): PowerPlantAction[] {
  const direction =
    Condenser.steamMass > S.CondenserSteamHigh ? 1 : Condenser.steamMass < S.CondenserSteamLow ? -1 : 0
  const delta = nudge(Condenser.recirculationPumpValvePosition, direction)
  return delta === 0
    ? []
    : [{ type: "SET_RECIRCULATION_PUMP_VALVE_POSITION", payload: { recirculationPumpValvePosition: delta } }]
}

export function holdHotwell({ Condenser }: PowerPlantState): PowerPlantAction[] {
  const level = Condenser.hotwellWaterVolume / CstCondenser.TotalVolume
  const makeup = hysteresis(Condenser.makeupValvePosition > 0, level, S.HotwellMakeupBelow, S.HotwellTarget, -1)
  const reject = hysteresis(Condenser.rejectValvePosition > 0, level, S.HotwellRejectAbove, S.HotwellTarget, 1)
  const actions: PowerPlantAction[] = []
  const makeupDelta = (makeup ? 1 : 0) - Condenser.makeupValvePosition
  const rejectDelta = (reject ? 1 : 0) - Condenser.rejectValvePosition
  if (makeupDelta !== 0)
    actions.push({ type: "SET_MAKEUP_VALVE_POSITION", payload: { makeupValvePosition: makeupDelta } })
  if (rejectDelta !== 0)
    actions.push({ type: "SET_REJECT_VALVE_POSITION", payload: { rejectValvePosition: rejectDelta } })
  return actions
}

export function loopOperator(state: PowerPlantState, time: number): PowerPlantAction[] {
  const adjustNow = isAdjustTime(time, S.AdjustEvery)
  return [
    ...startSteam(state),
    ...holdHotwell(state),
    ...(adjustNow ? [...(state.Turbine.mainSteamValve ? holdPressureWithGas(state) : []), ...holdBoilerLevel(state), ...holdCondensing(state)] : []),
  ]
}
