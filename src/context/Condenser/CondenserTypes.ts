export type CondenserState = {
  condenserTemperature: number
  condensateWaterVolume: number
  condensateReturnRate: number
  coolingRate: number
  vacuum: number // in mBar (negative pressure)
  isAirExtractionPumpEnabled: boolean
  isSjaeEnabled: boolean
  sjaeValvePosition: number // 0-100%
}

// Action type constants
export const CONDENSE_STEAM = 'CONDENSE_STEAM';
export const UPDATE_CONDENSER_TEMPERATURE = 'UPDATE_CONDENSER_TEMPERATURE';
export const RETURN_CONDENSATE = 'RETURN_CONDENSATE';
export const SET_COOLING_RATE = 'SET_COOLING_RATE';
export const SET_VACUUM = 'SET_VACUUM';
export const SET_AIR_EXTRACTION_PUMP_ENABLED = 'SET_AIR_EXTRACTION_PUMP_ENABLED';
export const SET_SJAE_ENABLED = 'SET_SJAE_ENABLED';
export const SET_SJAE_VALVE_POSITION = 'SET_SJAE_VALVE_POSITION';

export type CondenserAction =
  | { type: typeof CONDENSE_STEAM; payload: number }
  | { type: typeof UPDATE_CONDENSER_TEMPERATURE; payload: number }
  | { type: typeof RETURN_CONDENSATE }
  | { type: typeof SET_COOLING_RATE; payload: number }
  | { type: typeof SET_VACUUM; payload: number }
  | { type: typeof SET_AIR_EXTRACTION_PUMP_ENABLED; payload: boolean }
  | { type: typeof SET_SJAE_ENABLED; payload: boolean }
  | { type: typeof SET_SJAE_VALVE_POSITION; payload: number }

export default CondenserState
