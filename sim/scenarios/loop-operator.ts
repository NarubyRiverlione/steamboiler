import { CstSimulation } from "../../src/context/const"
import PowerPlantAction from "../../src/context/PowerPlantActions"
import PowerPlantState from "../../src/context/PowerPlantState"

// An operator holding the closed water loop, decided from state alone (see docs/plant/feedwater-loop.md).
// Valve actions are deltas, so the operator asks for the difference to the position it wants.

const { CstBoiler, CstCondenser, CstTurbine } = CstSimulation

export const LoopSettings = {
  SteamGasFlow: 5000, // liters/second once the main steam valve opens
  BypassOpening: 0.05, // bypass position when the main steam valve opens, and its minimum
  SjaeOpening: 1, // SJAE valve position once there is steam
  CondensationPumpOpening: 0.1, // condensation pump position when the main steam valve opens
  BoilerPressureTarget: 165, // bar: operating pressure the bypass holds
  BoilerPressureBand: 2, // bar: no bypass change within target ± band
  BoilerLevelTarget: 0.5, // fraction of boiler capacity
  BoilerLevelBand: 0.05, // no pump change within target ± band
  HotwellMakeupBelow: 0.65, // fraction of condenser capacity: open makeup
  HotwellTarget: 0.7, // close makeup / reject once back here
  HotwellRejectAbove: 0.75, // open reject
  CondenserSteamHigh: 100, // kg in the condenser: more cooling water
  CondenserSteamLow: 10, // kg: less cooling water
  ValveNudge: 0.01, // position change per adjustment
  AdjustEvery: 1, // sim-seconds between bypass, pump and cooling adjustments
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

// At pressure: gas down to the steam flow, main steam valve open, bypass and condensation pump to their start positions
function openMainSteam({ Boiler, Turbine, Condenser }: PowerPlantState): PowerPlantAction[] {
  if (Turbine.mainSteamValve) return []
  const gasDown = Boiler.gasFlow - S.SteamGasFlow
  return [
    ...(gasDown > 0 ? [{ type: "DECREASE_GAS_FLOW", amount: gasDown } as const] : []),
    { type: "TOGGLE_MAIN_STEAM_VALVE" },
    ...toPosition(Turbine.bypassValvePosition, S.BypassOpening, (bypassValvePosition) => ({
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

// Outside the band always correct; inside it, only lean against the trend so the value settles
function bandDirection(error: number, band: number, trend: number): -1 | 0 | 1 {
  const correcting = Math.abs(error) > band || Math.sign(trend) === Math.sign(error)
  if (error === 0 || !correcting) return 0
  return error < 0 ? 1 : -1
}

// The bypass holds boiler pressure: open above the band, close below it, never below its start
// opening. The state carries no pressure trend, so unlike the level there is no leaning inside the band.
function holdBoilerPressure({ Boiler, Turbine }: PowerPlantState): PowerPlantAction[] {
  if (!Turbine.mainSteamValve) return []
  const error = Boiler.pressure - S.BoilerPressureTarget
  const direction = Math.abs(error) <= S.BoilerPressureBand ? 0 : error > 0 ? 1 : -1
  const position = Turbine.bypassValvePosition
  const delta = Math.max(S.BypassOpening, position + nudge(position, direction)) - position
  return delta === 0 ? [] : [{ type: "ADJUST_STEAM_BYPASS_VALVE", payload: { bypassValvePosition: delta } }]
}

function holdBoilerLevel({ Boiler, Condenser, Turbine }: PowerPlantState): PowerPlantAction[] {
  if (!Turbine.mainSteamValve) return []
  const level = Boiler.waterVolume / CstBoiler.TotalVolume
  const direction = bandDirection(level - S.BoilerLevelTarget, S.BoilerLevelBand, Boiler.deltaWaterVolume)
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
    ...(adjustNow ? [...holdBoilerPressure(state), ...holdBoilerLevel(state), ...holdCondensing(state)] : []),
  ]
}
