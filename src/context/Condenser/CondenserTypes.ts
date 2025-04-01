export type CondenserState = {
  pressure: number // in mBar (negative pressure)
  steamVolume: number
  hotwellWaterVolume: number
  intakeFlowRate: number // g/s Flow rate from turbine to condenser
  returnRate: number
  coolingRate: number
  isAirExtractionPumpEnabled: boolean
  isSjaeEnabled: boolean
  sjaeValvePosition: number // 0-100%
  recirculationPumpFlowRate: number // Flow rate of the recirculation pump
  recirculationPumpValvePosition: number // 0-1 (0-100%)
  condensationPumpValvePosition: number // 0-1 (0-100%)
  deltaWaterVolume: number
}

export type CondenserAction =
  | { type: "SET_AIR_EXTRACTION_PUMP_ENABLED"; payload: { isAirExtractionPumpEnabled: boolean } }
  | { type: "SET_SJAE_ENABLED"; payload: { isSjaeEnabled: boolean } }
  | { type: "SET_SJAE_VALVE_POSITION"; payload: { sjaeValvePosition: number } }
  | { type: "SET_RECIRCULATION_PUMP_VALVE_POSITION"; payload: { recirculationPumpValvePosition: number } }
  | { type: "SET_CONDENSATION_PUMP_VALVE_POSITION"; payload: { condensationPumpValvePosition: number } }
  | { type: "SIMULATE_TICK"; payload: { boilerSteamFlow: number } }

export default CondenserState
