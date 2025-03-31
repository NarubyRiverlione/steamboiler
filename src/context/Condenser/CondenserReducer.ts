import { CstPhysics } from "../const"
import { CondenserTick } from "./CondenserTick"
import CondenserState, { CondenserAction } from "./CondenserTypes"

export const initialCondenserState: CondenserState = {
  // temperature: 25,
  pressure: CstPhysics.AtmosphericPressure * 1000, // mBar (initial atmospheric pressure)
  hotwellWaterVolume: 0,
  steamVolume: 0, // Start at 0
  intakeFlowRate: 0,
  returnRate: 0,
  coolingRate: 1,
  isAirExtractionPumpEnabled: false,
  isSjaeEnabled: false,
  sjaeValvePosition: 0, // 0% open
  recirculationPumpFlowRate: 0,
  recirculationPumpValvePosition: 0, // 0% open
  condensationPumpValvePosition: 0,
  deltaWaterVolume: 0,
}

const condenserReducer = (
  state: CondenserState = initialCondenserState,
  action: CondenserAction,
): CondenserState => {
  switch (action.type) {
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
    case "SET_CONDENSATION_PUMP_VALVE_POSITION": {
      return {
        ...state,
        condensationPumpValvePosition: action.payload,
      }
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
