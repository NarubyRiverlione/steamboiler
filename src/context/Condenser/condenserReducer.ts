import { CstPhysics } from "../const"
import { CondenserTick } from "./CondenserTick"
import CondenserState, { CondenserAction } from "./CondenserTypes"

export const initialCondenserState: CondenserState = {
  temperature: 25,
  pressure: CstPhysics.AtmosphericPressure * 1000, // mBar (initial atmospheric pressure)
  waterVolume: 0,
  steamVolume: 0, // Start at 0
  intakeFlowRate: 0,
  returnRate: 0,
  coolingRate: 1,
  isAirExtractionPumpEnabled: false,
  isSjaeEnabled: false,
  sjaeValvePosition: 0, // 0% open
  recirculationPumpFlowRate: 0,
  recirculationPumpValvePosition: 0, // 0% open
  // condenserSteamVolume: 0,
  // condenserLiquidVolume: 0,
}

const condenserReducer = (state: CondenserState = initialCondenserState, action: CondenserAction): CondenserState => {
  switch (action.type) {
    // case "CONDENSE_STEAM":
    //   return {
    //     ...state,
    //     waterVolume: state.waterVolume + action.payload,
    //   }
    // case "UPDATE_CONDENSER_TEMPERATURE":
    //   return {
    //     ...state,
    //     temperature: action.payload,
    //   }
    // case "RETURN_CONDENSATE":
    //   return {
    //     ...state,
    //     waterVolume: 0,
    //   }
    // case "SET_COOLING_RATE":
    //   return {
    //     ...state,
    //     coolingRate: action.payload,
    //   }
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
    case "SET_RECIRCULATION_PUMP_VALVE_POSITION":
      return {
        ...state,
        recirculationPumpValvePosition: action.payload,
      }
    // case "UPDATE_HOTWELL_LEVEL":
    //   return {
    //     ...state,
    //     steamVolume: action.payload,
    //   }
    // case "UPDATE_HOTWELL_TO_CONDENSER_FLOW_RATE":
    //   return {
    //     ...state,
    //     intakeFlowRate: action.payload,
    //   }
    // case "UPDATE_RECIRCULATION_PUMP_FLOW_RATE":
    //   return {
    //     ...state,
    //     recirculationPumpFlowRate: action.payload,
    //   }
    // case "UPDATE_CONDENSER_STEAM_VOLUME":
    //   return {
    //     ...state,
    //     condenserSteamVolume: action.payload,
    //   }
    // case "UPDATE_CONDENSER_LIQUID_VOLUME":
    //   return {
    //     ...state,
    //     condenserLiquidVolume: action.payload,
    //   }

    case "SIMULATE_TICK": {
      const { boilerSteamFlow, deltaTime } = action.payload
      return CondenserTick(state, boilerSteamFlow, deltaTime)
    }

    default:
      return state
  }
}

export default condenserReducer
