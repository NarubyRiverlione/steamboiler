import CondenserState, { 
  CondenserAction, 
  CONDENSE_STEAM, 
  UPDATE_CONDENSER_TEMPERATURE, 
  RETURN_CONDENSATE, 
  SET_COOLING_RATE,
  SET_VACUUM,
  SET_AIR_EXTRACTION_PUMP_ENABLED,
  SET_SJAE_ENABLED,
  SET_SJAE_VALVE_POSITION
} from "./CondenserTypes"

export const initialCondenserState: CondenserState = {
  condenserTemperature: 25,
  condensateWaterVolume: 0,
  condensateReturnRate: 0,
  coolingRate: 1,
  vacuum: 0, // 0 mBar (atmospheric pressure)
  isAirExtractionPumpEnabled: false,
  isSjaeEnabled: false,
  sjaeValvePosition: 0, // 0% open
}

const condenserReducer = (state: CondenserState = initialCondenserState, action: CondenserAction): CondenserState => {
  switch (action.type) {
    case CONDENSE_STEAM:
      return {
        ...state,
        condensateWaterVolume: state.condensateWaterVolume + action.payload,
      }
    case UPDATE_CONDENSER_TEMPERATURE:
      return {
        ...state,
        condenserTemperature: action.payload,
      }
    case RETURN_CONDENSATE:
      return {
        ...state,
        condensateWaterVolume: 0,
      }
    case SET_COOLING_RATE:
      return {
        ...state,
        coolingRate: action.payload,
      }
    case SET_VACUUM:
      return {
        ...state,
        vacuum: action.payload,
      }
    case SET_AIR_EXTRACTION_PUMP_ENABLED:
      return {
        ...state,
        isAirExtractionPumpEnabled: action.payload,
      }
    case SET_SJAE_ENABLED:
      return {
        ...state,
        isSjaeEnabled: action.payload,
      }
    case SET_SJAE_VALVE_POSITION:
      return {
        ...state,
        sjaeValvePosition: action.payload,
      }
    default:
      return state
  }
}

export default condenserReducer
