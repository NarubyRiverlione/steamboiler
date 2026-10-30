import { CstSimulation } from "../../src/context/const"
import PowerPlantAction from "../../src/context/PowerPlantActions"
import PowerPlantState from "../../src/context/PowerPlantState"

// An operator holding the closed water loop, decided from state alone (see docs/feedwater loop.md).
// Valve actions are deltas, so the operator asks for the difference to the position it wants.

const { CstBoiler, CstCondenser, CstTurbine } = CstSimulation

export const LoopSettings = {
  BoilerLevelTarget: 0.5, // fraction of boiler capacity
  BoilerLevelBand: 0.05, // no pump change within target ± band
  HotwellMakeupBelow: 0.65, // fraction of condenser capacity: open makeup
  HotwellTarget: 0.7, // close makeup / reject once back here
  HotwellRejectAbove: 0.75, // open reject
  BypassOpening: 0.1, // bypass position once the main steam valve is open
  CondenserSteamHigh: 100, // kg in the condenser: more cooling water
  CondenserSteamLow: 10, // kg: less cooling water
  ValveNudge: 0.01, // position change per adjustment
  AdjustEvery: 1, // sim-seconds between pump and cooling adjustments
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

const openMainSteam = (atPressure: boolean, { Turbine }: PowerPlantState): PowerPlantAction[] =>
  atPressure && !Turbine.mainSteamValve ? [{ type: "TOGGLE_MAIN_STEAM_VALVE" }] : []

const openBypass = ({ Turbine }: PowerPlantState): PowerPlantAction[] =>
  Turbine.mainSteamValve && Turbine.bypassValvePosition < S.BypassOpening
    ? [
        {
          type: "ADJUST_STEAM_BYPASS_VALVE",
          payload: { bypassValvePosition: S.BypassOpening - Turbine.bypassValvePosition },
        },
      ]
    : []

// The SJAE trips below main-steam-valve pressure; restart it once there is steam
const restartSjae = (atPressure: boolean, { Condenser }: PowerPlantState): PowerPlantAction[] =>
  atPressure && !Condenser.isSjaeEnabled ? [{ type: "SET_SJAE_ENABLED", payload: { isSjaeEnabled: true } }] : []

function startSteam(state: PowerPlantState): PowerPlantAction[] {
  const atPressure = state.Boiler.pressure > CstTurbine.MainSteamValveMinimumPressure
  return [...openMainSteam(atPressure, state), ...openBypass(state), ...restartSjae(atPressure, state)]
}

// Outside the band always correct; inside it, only lean against the trend so the level settles
function levelDirection(level: number, trend: number): -1 | 0 | 1 {
  const error = level - S.BoilerLevelTarget
  const correcting = Math.abs(error) > S.BoilerLevelBand || Math.sign(trend) === Math.sign(error)
  if (error === 0 || !correcting) return 0
  return error < 0 ? 1 : -1
}

function holdBoilerLevel({ Boiler, Condenser }: PowerPlantState): PowerPlantAction[] {
  const direction = levelDirection(Boiler.waterVolume / CstBoiler.TotalVolume, Boiler.deltaWaterVolume)
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
  const adjustNow = Number.isInteger(Math.round(time * 1e6) / 1e6 / S.AdjustEvery)
  return [
    ...startSteam(state),
    ...holdHotwell(state),
    ...(adjustNow ? [...holdBoilerLevel(state), ...holdCondensing(state)] : []),
  ]
}
