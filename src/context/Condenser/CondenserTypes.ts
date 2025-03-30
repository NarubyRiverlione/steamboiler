export type CondenserState = {
  condenserTemperature: number
  condensateWaterVolume: number
  condensateReturnRate: number
  coolingRate: number
  pressure: number // in mBar (negative pressure)
  isAirExtractionPumpEnabled: boolean
  isSjaeEnabled: boolean
  sjaeValvePosition: number // 0-100%
}

export type CondenserAction =
  | { type: "CONDENSE_STEAM"; payload: number }
  | { type: "UPDATE_CONDENSER_TEMPERATURE"; payload: number }
  | { type: "RETURN_CONDENSATE" }
  | { type: "SET_COOLING_RATE"; payload: number }
  // | { type: "SET_VACUUM"; payload: number }
  | { type: "SET_AIR_EXTRACTION_PUMP_ENABLED"; payload: boolean }
  | { type: "SET_SJAE_ENABLED"; payload: boolean }
  | { type: "SET_SJAE_VALVE_POSITION"; payload: number }
  | { type: "SIMULATE_TICK"; payload: { boilerSteamFlow: number; deltaTime: number } }

export default CondenserState
