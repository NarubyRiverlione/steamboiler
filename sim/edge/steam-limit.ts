import { superheatSteps } from "../../src/utils/steamSuperheatedData"
import { getBoilingPoint } from "../../src/utils/steamTable"

// The hottest steam (°C) the superheated table holds at a pressure (bar): its last column above saturation
export const CstSteamTableLimit = (pressure: number): number => getBoilingPoint(pressure) + superheatSteps[superheatSteps.length - 1]
