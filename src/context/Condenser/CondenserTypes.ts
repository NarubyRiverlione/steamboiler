type CondenserState = {
  condenserTemperature: number
  condensateWaterVolume: number
  condensateReturnRate: number
  coolingRate: number
}

export type CondenserAction =
  | { type: "CONDENSE_STEAM"; payload: number }
  | { type: "UPDATE_CONDENSER_TEMPERATURE"; payload: number }
  | { type: "RETURN_CONDENSATE" }
  | { type: "SET_COOLING_RATE"; payload: number }

export default CondenserState
