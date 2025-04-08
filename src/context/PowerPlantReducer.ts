import { CstPhysics, CstSimulation } from "./const"
import { calculateHeatingEnergy } from "../utils/boilerCalculations"
import PowerPlantAction from "./PowerPlantActions"
import PowerPlantState from "./PowerPlantState"
import PowerPlantTick from "./PowerPlantTick"

const { CstBoiler } = CstSimulation
export const initialPowerPlantState: PowerPlantState = {
  Boiler: {
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
    deltaSteamMass: 0,
    mainSteamValve: false, // closed
  },
  Condenser: {
    pressure: CstPhysics.AtmosphericPressure_mBar, // mBar (initial atmospheric pressure)
    hotwellWaterVolume: CstSimulation.CstCondenser.HotwellStartVolume,
    steamMass: 0, // Start at 0
    intakeFlowRate: 0,
    returnRate: 0,
    coolingRate: 1,
    isAirExtractionPumpEnabled: false,
    isSjaeEnabled: false,
    sjaeValvePosition: 0, // 0% open
    recirculationPumpValvePosition: 0, // 0% open
    condensationPumpValvePosition: 0,
    deltaWaterVolume: 0,
  },
  Turbine: {
    electricOutput: 0, // MW
  },
}

export function powerPlantReducer(state: PowerPlantState, action: PowerPlantAction): PowerPlantState {
  switch (action.type) {
    case "SIMULATE_TICK":
      return PowerPlantTick(state)

    //#region Boiler
    case "INCREASE_GAS_FLOW":
      return {
        ...state,
        Boiler: {
          ...state.Boiler,
          gasFlow: Math.min(CstBoiler.MaxGasFlow, state.Boiler.gasFlow + action.amount), // Cap at 10 L/s
        },
      }
    case "DECREASE_GAS_FLOW":
      return {
        ...state,
        Boiler: {
          ...state.Boiler,
          gasFlow: Math.max(0, state.Boiler.gasFlow - action.amount),
        },
      }
    case "TOGGLE_FILL_VALVE":
      return {
        ...state,
        Boiler: {
          ...state.Boiler,
          fillValveOpen: !state.Boiler.fillValveOpen,
        },
      }
    case "TOGGLE_DRAIN_VALVE":
      return {
        ...state,
        Boiler: {
          ...state.Boiler,
          drainValveOpen: !state.Boiler.drainValveOpen,
        },
      }
    case "TOGGLE_MAIN_STEAM_VALVE":
      return {
        ...state,
        Boiler: {
          ...state.Boiler,
          // only open Main Steam Valve if pressure is above Minimum
          mainSteamValve:
            !state.Boiler.mainSteamValve && state.Boiler.pressure > CstBoiler.MainSteamValveMinimumPressure,
        },
      }
    case "ADJUST_STEAM_BYPASS_VALVE": {
      // Ensure the valve position stays within 0-100%
      const bypassValvePosition = Math.max(0, Math.min(100, state.Boiler.bypassValvePosition + action.amount))

      return { ...state, Boiler: { ...state.Boiler, bypassValvePosition } }
    }
    case "ADJUST_STEAM_TURBINE_VALVE": {
      // Ensure the valve position stays within 0-100%
      const turbineValvePosition = Math.max(
        0,
        Math.min(100, state.Boiler.turbineValvePosition + action.amount),
      )
      return { ...state, Boiler: { ...state.Boiler, turbineValvePosition } }
    }
    //#endregion
    //#region Condenser
    case "SET_AIR_EXTRACTION_PUMP_ENABLED": {
      const {
        payload: { isAirExtractionPumpEnabled },
      } = action
      return {
        ...state,
        Condenser: {
          ...state.Condenser,
          isAirExtractionPumpEnabled,
        },
      }
    }
    case "SET_SJAE_ENABLED":
      return {
        ...state,
        Condenser: {
          ...state.Condenser,
          isSjaeEnabled: action.payload.isSjaeEnabled,
        },
      }
    case "SET_SJAE_VALVE_POSITION":
      return {
        ...state,
        Condenser: {
          ...state.Condenser,
          sjaeValvePosition: action.payload.sjaeValvePosition,
        },
      }
    case "SET_RECIRCULATION_PUMP_VALVE_POSITION":
      return {
        ...state,
        Condenser: {
          ...state.Condenser,
          recirculationPumpValvePosition: action.payload.recirculationPumpValvePosition,
        },
      }
    case "SET_CONDENSATION_PUMP_VALVE_POSITION": {
      return {
        ...state,
        Condenser: {
          ...state.Condenser,
          condensationPumpValvePosition: action.payload.condensationPumpValvePosition,
        },
      }
    }
    //#endregion

    default:
      return state
  }
}
