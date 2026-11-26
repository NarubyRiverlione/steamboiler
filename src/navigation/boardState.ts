/** The board state (#144, ADR 0055): derived from the plant state alone, chosen once at the layout level. */

import { isSafetyBusLive, isVitalBusLive } from "../context/SafetyBus"
import type PowerPlantState from "../context/PowerPlantState"

export type BoardState = "normal" | "emergency" | "dark" | "ended"

export function deriveBoardState(state: PowerPlantState): BoardState {
  if (state.simulationEnded) return "ended"
  if (isVitalBusLive(state)) return "normal"
  return isSafetyBusLive(state) ? "emergency" : "dark"
}
