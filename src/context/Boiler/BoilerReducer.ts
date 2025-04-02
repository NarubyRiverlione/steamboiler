import BoilerState, { BoilerAction } from "./BoilerTypes"
import { CstSimulation } from "../const"
import BoilerTick from "./BoilerTick"
import { calculateHeatingEnergy } from "../../utils/boilerCalculations"

const { CstBoiler } = CstSimulation

export const initialBoilerState: BoilerState = {
  waterVolume: CstBoiler.StartWaterVolume, // liters
  temperature: CstBoiler.StartTemperature, // Celsius
  pressure: 1, // bar
  gasFlow: 0, // liters/second
  fillValveOpen: false,
  drainValveOpen: false,
  energy: calculateHeatingEnergy(CstBoiler.StartWaterVolume, 0, CstBoiler.StartTemperature), // kJ
  energyDelta: 0, // kJ/s
  steamMass: 0, // kg - Mass of steam currently in the boiler
  bypassValvePosition: 0, // 0-100% open
  turbineValvePosition: 0, // 0-100% open
  bypassSteamFlowOut: 0, // g/s
  turbineSteamFlowOut: 0, // g/s
  deltaWaterVolume: 0,
  mainSteamValve: false, // closed
}

function boilerReducer(state: BoilerState, action: BoilerAction): BoilerState {
  switch (action.type) {
    case "INCREASE_GAS_FLOW":
      return {
        ...state,
        gasFlow: Math.min(CstBoiler.MaxGasFlow, state.gasFlow + action.amount), // Cap at 10 L/s
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
    case "TOGGLE_MAIN_STEAM_VALVE":
      return {
        ...state,
        // only open Main Steam Valve if pressure is above Minimum
        mainSteamValve: !state.mainSteamValve && state.pressure > CstBoiler.MainSteamValveMinimumPressure,
      }
    case "ADJUST_STEAM_BYPASS_VALVE": {
      // Ensure the valve position stays within 0-100%
      const bypassValvePosition = Math.max(0, Math.min(100, state.bypassValvePosition + action.amount))

      return {
        ...state,
        bypassValvePosition,
      }
    }
    case "ADJUST_STEAM_TURBINE_VALVE": {
      // Ensure the valve position stays within 0-100%
      const turbineValvePosition = Math.max(0, Math.min(100, state.turbineValvePosition + action.amount))

      return {
        ...state,
        turbineValvePosition,
      }
    }
    case "ADD_CONDENSATION_WATER": {
      return {
        ...state,
        waterVolume: state.waterVolume + action.amount,
        deltaWaterVolume: state.deltaWaterVolume + action.amount,
      }
    }
    case "SIMULATE_TICK": {
      return BoilerTick(state)
    }

    default:
      return state
  }
}

export default boilerReducer
