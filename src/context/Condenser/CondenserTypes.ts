export type CondenserState = {
  condenserTemperature: number
  condensateWaterVolume: number
  condensateReturnRate: number
  coolingRate: number
  pressure: number // in mBar (negative pressure)
  isAirExtractionPumpEnabled: boolean
  isSjaeEnabled: boolean
  sjaeValvePosition: number // 0-100%
  hotwellLevel: number // Relative level, 0 at start, positive when rising, negative when falling
  hotwellToCondenserFlowRate: number // Flow rate from hotwell to condenser
  recirculationPumpFlowRate: number // Flow rate of the recirculation pump
  recirculationPumpValvePosition: number // 0-1 (0-100%)
  condenserSteamVolume: number // Volume of steam in the condenser
  condenserLiquidVolume: number // Volume of liquid in the condenser
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
  | { type: "SET_RECIRCULATION_PUMP_VALVE_POSITION"; payload: number }
  | { type: "UPDATE_HOTWELL_LEVEL"; payload: number }
  | { type: "UPDATE_HOTWELL_TO_CONDENSER_FLOW_RATE"; payload: number }
  | { type: "UPDATE_RECIRCULATION_PUMP_FLOW_RATE"; payload: number }
  | { type: "UPDATE_CONDENSER_STEAM_VOLUME"; payload: number }
  | { type: "UPDATE_CONDENSER_LIQUID_VOLUME"; payload: number }
  | { type: "SIMULATE_TICK"; payload: { boilerSteamFlow: number; deltaTime: number } }

export default CondenserState
