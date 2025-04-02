import { CstPhysics, CstSimulation } from "../const"
import { CondenserTick } from "./CondenserTick"
import CondenserState, { CondenserAction } from "./CondenserTypes"

export const initialCondenserState: CondenserState = {
  outletTemperature: 25, // Initial temperature of condensed water returning to boiler (°C)
  pressure: CstPhysics.AtmosphericPressure * 1000, // mBar (initial atmospheric pressure)
  hotwellWaterVolume: CstSimulation.CstCondenser.HotwellStartVolume,
  steamVolume: 0, // Start at 0
  intakeFlowRate: 0,
  returnRate: 0,
  coolingRate: 1,
  isAirExtractionPumpEnabled: false,
  isSjaeEnabled: false,
  sjaeValvePosition: 0, // 0% open
  recirculationPumpValvePosition: 0, // 0% open
  condensationPumpValvePosition: 0,
  deltaWaterVolume: 0,
}

const condenserReducer = (
  state: CondenserState = initialCondenserState,
  action: CondenserAction,
): CondenserState => {
  switch (action.type) {
    case "SET_AIR_EXTRACTION_PUMP_ENABLED": {
      const {
        payload: { isAirExtractionPumpEnabled },
      } = action
      return {
        ...state,
        isAirExtractionPumpEnabled,
      }
    }
    case "SET_SJAE_ENABLED":
      return {
        ...state,
        isSjaeEnabled: action.payload.isSjaeEnabled,
      }
    case "SET_SJAE_VALVE_POSITION":
      return {
        ...state,
        sjaeValvePosition: action.payload.sjaeValvePosition,
      }
    case "SET_RECIRCULATION_PUMP_VALVE_POSITION":
      return {
        ...state,
        recirculationPumpValvePosition: action.payload.recirculationPumpValvePosition,
      }
    case "SET_CONDENSATION_PUMP_VALVE_POSITION": {
      return {
        ...state,
        condensationPumpValvePosition: action.payload.condensationPumpValvePosition,
      }
    }
    case "SIMULATE_TICK": {
      return CondenserTick(state, action.payload.boilerSteamFlow)
    }

    default:
      return state
  }
}

export default condenserReducer
