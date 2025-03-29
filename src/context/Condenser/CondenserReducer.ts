import CondenserState, { CondenserAction } from "./CondenserTypes"

export const initialCondenserState: CondenserState = {
  condenserTemperature: 25,
  condensateWaterVolume: 0,
  condensateReturnRate: 0,
  coolingRate: 1,
}

const condenserReducer = (state: CondenserState = initialCondenserState, action: CondenserAction): CondenserState => {
  switch (action.type) {
    case "CONDENSE_STEAM":
      return {
        ...state,
        condensateWaterVolume: state.condensateWaterVolume + action.payload,
      }
    case "UPDATE_CONDENSER_TEMPERATURE":
      return {
        ...state,
        condenserTemperature: action.payload,
      }
    case "RETURN_CONDENSATE":
      return {
        ...state,
        condensateWaterVolume: 0,
      }
    case "SET_COOLING_RATE":
      return {
        ...state,
        coolingRate: action.payload,
      }
    default:
      return state
  }
}

export default condenserReducer
