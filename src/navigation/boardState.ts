/** The board state (#144, ADR 0055, #196, ADR 0056): derived from the plant state alone, chosen once at the layout level. */

import { isVitalBusLive } from "../context/SafetyBus"
import type PowerPlantState from "../context/PowerPlantState"

export type BoardState = "normal" | "emergency" | "ended"

export function deriveBoardState(state: PowerPlantState): BoardState {
  if (state.simulationEnded) return "ended"
  return isVitalBusLive(state) ? "normal" : "emergency"
}
