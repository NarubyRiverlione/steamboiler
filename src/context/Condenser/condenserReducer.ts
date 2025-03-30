import { CstPhysics } from "../const"
import { CondenserTick } from "./CondenserTick"
import CondenserState, { CondenserAction } from "./CondenserTypes"

export const initialCondenserState: CondenserState = {
  condenserTemperature: 25,
  condensateWaterVolume: 0,
  condensateReturnRate: 0,
  coolingRate: 1,
  pressure: CstPhysics.AtmosphericPressure * 1000, // mBar (initial atmospheric pressure)
  isAirExtractionPumpEnabled: false,
  isSjaeEnabled: false,
  sjaeValvePosition: 0, // 0% open
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
    // case "SET_VACUUM":
    //   return {
    //     ...state,
    //     pressure: action.payload,
    //   }
    case "SET_AIR_EXTRACTION_PUMP_ENABLED":
      return {
        ...state,
        isAirExtractionPumpEnabled: action.payload,
      }
    case "SET_SJAE_ENABLED":
      return {
        ...state,
        isSjaeEnabled: action.payload,
      }
    case "SET_SJAE_VALVE_POSITION":
      return {
        ...state,
        sjaeValvePosition: action.payload,
      }

    case "SIMULATE_TICK": {
      const { boilerSteamFlow, deltaTime } = action.payload
      return CondenserTick(state, boilerSteamFlow, deltaTime)
    }

    default:
      return state
  }
}

export default condenserReducer
