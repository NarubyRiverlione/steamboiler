import BoilerState, { BoilerAction } from "./BoilerTypes"
import { CstSimulation } from "../const"
import BoilerTick from "./BoilerTick"

export const initialBoilerState: BoilerState = {
  waterVolume: CstSimulation.StartWaterVolume, // liters
  temperature: CstSimulation.StartTemperature, // Celsius
  pressure: 1, // bar
  gasFlow: 0, // liters/second
  steamRate: 0, // kg/second - Average over last 10 seconds
  steamRateHistory: [], // History for averaging
  fillValveOpen: false,
  drainValveOpen: false,
  energy: 0, // kJ
  energyDelta: 0, // kJ/s
  steamMass: 0, // kg - Mass of steam currently in the boiler
  mainSteamValvePosition: 0, // 0-100% open
  steamFlowOut: 0, // g/s
}

function boilerReducer(state: BoilerState, action: BoilerAction): BoilerState {
  switch (action.type) {
    case "INCREASE_GAS_FLOW":
      return {
        ...state,
        gasFlow: Math.min(CstSimulation.MaxGasFlow, state.gasFlow + action.amount), // Cap at 10 L/s
      }

    case "DECREASE_GAS_FLOW":
      return {
        ...state,
        gasFlow: Math.max(0, state.gasFlow - action.amount),
      }

    case "TOGGLE_FILL_VALVE":
      return {
        ...state,
        fillValveOpen: !state.fillValveOpen,
      }

    case "TOGGLE_DRAIN_VALVE":
      return {
        ...state,
        drainValveOpen: !state.drainValveOpen,
      }

    case "ADJUST_MAIN_STEAM_VALVE": {
      // Ensure the valve position stays within 0-100%
      const newPosition = Math.max(0, Math.min(100, state.mainSteamValvePosition + action.amount))

      return {
        ...state,
        mainSteamValvePosition: newPosition,
      }
    }

    case "SIMULATE_TICK": {
      const { deltaTime } = action
      return BoilerTick(state, deltaTime)
    }

    default:
      return state
  }
}

export default boilerReducer
