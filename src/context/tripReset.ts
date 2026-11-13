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

type Refusal = (state: PowerPlantState) => string | undefined

// The mapped type makes a missing rule a compile error
const refusals: Record<TripId, Refusal> = {
  burner: ({ Boiler }) => (isBelowBurnerLowLow(Boiler) ? "Boiler level is still below the burner low-low level" : undefined),
  boilerHighHigh: ({ Boiler }) => (isAtBoilerHighHigh(Boiler) ? "Boiler level is still at the high-high level" : undefined),
  feedPump: ({ Deaerator }) => (deaeratorLevel(Deaerator.waterVolume) < CstDeaerator.LowLowLevel ? "Deaerator level is still below low-low" : undefined),
  condensationPump: ({ Condenser }) => (hotwellLevel(Condenser.hotwellWaterVolume) < CstCondenser.HotwellLowLow ? "Hotwell level is still below low-low" : undefined),
  // Evaluated live; the low-pressure closure of the main steam valve has no persistent condition and never blocks
  turbine: ({ Boiler, Condenser, Turbine }) => {
    if (isAboveVacuumLimit(Condenser.pressure)) return "Condenser pressure is still above the vacuum limit"
    if (isAtOverspeed(Turbine.rpm)) return "Turbine is still at overspeed"
    return isAtBoilerHighHigh(Boiler) ? "Boiler level is still at the high-high level" : undefined
  },
}

// True while the trip's flag is set
export function isTripped(state: PowerPlantState, trip: TripId): boolean {
  switch (trip) {
    case "burner": return state.Boiler.burnerTripped
    case "boilerHighHigh": return state.Boiler.boilerLevelHighTripped
    case "feedPump": return state.Deaerator.feedPumpTripped
    case "condensationPump": return state.Condenser.condensationPumpTripped
    case "turbine": return state.Turbine.turbineTripped
  }
}

// Why the trip cannot be reset now, or undefined when its cause has gone
export const tripResetRefusal = (state: PowerPlantState, trip: TripId): string | undefined => refusals[trip](state)

// Clears the flag and nothing else: gas, valves and the gas knob stay where the trip left them. Untripped or refused: unchanged.
export function resetTrip(state: PowerPlantState, trip: TripId): PowerPlantState {
  if (!isTripped(state, trip) || tripResetRefusal(state, trip) !== undefined) return state
  switch (trip) {
    case "burner": return { ...state, Boiler: { ...state.Boiler, burnerTripped: false } }
    case "boilerHighHigh": return { ...state, Boiler: { ...state.Boiler, boilerLevelHighTripped: false } }
    case "feedPump": return { ...state, Deaerator: { ...state.Deaerator, feedPumpTripped: false } }
    case "condensationPump": return { ...state, Condenser: { ...state.Condenser, condensationPumpTripped: false } }
    case "turbine": return { ...state, Turbine: { ...state.Turbine, turbineTripped: false } }
  }
}
