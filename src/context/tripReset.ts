/**
 * Trip reset (ADR 0043): the only thing that clears a latched trip. One pure refusal per trip says why the reset is
 * not allowed yet, or undefined once the cause has gone, at the trip's own threshold. The reducer refuses on it and
 * the panel button is disabled on it.
 */

import { CstDeaerator, CstSimulation } from "./const"
import { deaeratorLevel } from "./Deaerator/DeaeratorTick"
import { hotwellLevel } from "../utils/condenserCalculation"
import { isAtOverspeed, isAboveVacuumLimit } from "../utils/turbineCalculations"
import { isAtBoilerHighHigh, isBelowBurnerLowLow } from "./Boiler/BoilerTick"
import PowerPlantState from "./PowerPlantState"

const { CstCondenser } = CstSimulation

export type TripId = "burner" | "boilerHighHigh" | "feedPump" | "condensationPump" | "turbine"

type TripRule = {
  readonly tripped: (state: PowerPlantState) => boolean
  readonly refusal: (state: PowerPlantState) => string | undefined
  readonly clear: (state: PowerPlantState) => PowerPlantState
}

// One rule per trip: its flag, why it cannot be reset yet, and the flag cleared. The mapped type makes a missing trip a compile error.
const rules: Record<TripId, TripRule> = {
  burner: {
    tripped: ({ Boiler }) => Boiler.burnerTripped,
    refusal: ({ Boiler }) => (isBelowBurnerLowLow(Boiler) ? "Boiler level is still below the burner low-low level" : undefined),
    clear: (state) => ({ ...state, Boiler: { ...state.Boiler, burnerTripped: false } }),
  },
  boilerHighHigh: {
    tripped: ({ Boiler }) => Boiler.boilerLevelHighTripped,
    refusal: ({ Boiler }) => (isAtBoilerHighHigh(Boiler) ? "Boiler level is still at the high-high level" : undefined),
    clear: (state) => ({ ...state, Boiler: { ...state.Boiler, boilerLevelHighTripped: false } }),
  },
  feedPump: {
    tripped: ({ Deaerator }) => Deaerator.feedPumpTripped,
    refusal: ({ Deaerator }) => (deaeratorLevel(Deaerator.waterVolume) < CstDeaerator.LowLowLevel ? "Deaerator level is still below low-low" : undefined),
    clear: (state) => ({ ...state, Deaerator: { ...state.Deaerator, feedPumpTripped: false } }),
  },
  condensationPump: {
    tripped: ({ Condenser }) => Condenser.condensationPumpTripped,
    refusal: ({ Condenser }) => (hotwellLevel(Condenser.hotwellWaterVolume) < CstCondenser.HotwellLowLow ? "Hotwell level is still below low-low" : undefined),
    clear: (state) => ({ ...state, Condenser: { ...state.Condenser, condensationPumpTripped: false } }),
  },
  // Evaluated live; the low-pressure closure of the main steam valve has no persistent condition and never blocks
  turbine: {
    tripped: ({ Turbine }) => Turbine.turbineTripped,
    refusal: ({ Boiler, Condenser, Turbine }) => {
      if (isAboveVacuumLimit(Condenser.pressure)) return "Condenser pressure is still above the vacuum limit"
      if (isAtOverspeed(Turbine.rpm)) return "Turbine is still at overspeed"
      return isAtBoilerHighHigh(Boiler) ? "Boiler level is still at the high-high level" : undefined
    },
    clear: (state) => ({ ...state, Turbine: { ...state.Turbine, turbineTripped: false } }),
  },
}

// True while the trip's flag is set
export const isTripped = (state: PowerPlantState, trip: TripId): boolean => rules[trip].tripped(state)

// Why the trip cannot be reset now, or undefined when its cause has gone
export const tripResetRefusal = (state: PowerPlantState, trip: TripId): string | undefined => rules[trip].refusal(state)

// Clears the flag and nothing else: gas, valves and the gas knob stay where the trip left them. Untripped or refused: unchanged.
export function resetTrip(state: PowerPlantState, trip: TripId): PowerPlantState {
  const rule: TripRule = rules[trip]
  return rule.tripped(state) && rule.refusal(state) === undefined ? rule.clear(state) : state
}
