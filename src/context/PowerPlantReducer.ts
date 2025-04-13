import { CstPhysics, CstSimulation } from "./const"
import { calculateHeatingEnergy } from "../utils/boilerCalculations"
import PowerPlantAction from "./PowerPlantActions"
import PowerPlantState from "./PowerPlantState"
import PowerPlantTick from "./PowerPlantTick"

const { CstBoiler, CstTurbine } = CstSimulation
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
    deltaWaterVolume: 0,
    deltaSteamMass: 0,
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
    electricOutput: 0, // MW,
    bypassValvePosition: 0,
    bypassSteamFlowOut: 0,
    turbineValvePosition: 0,
    turbineSteamFlowOut: 0,
    mainSteamValve: false, // closed
    rpm: 0,
    rpmSetPoint: CstTurbine.DefaultRPMSetPoint,
    holdMode: false,
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
    case "SET_SJAE_VALVE_POSITION": {
      const sjaeValvePosition = Math.max(
        0,
        Math.min(1, state.Condenser.sjaeValvePosition + action.payload.sjaeValvePosition),
      )
      return {
        ...state,
        Condenser: {
          ...state.Condenser,
          sjaeValvePosition,
        },
      }
    }
    case "SET_RECIRCULATION_PUMP_VALVE_POSITION": {
      const recirculationPumpValvePosition = Math.max(
        0,
        Math.min(
          1,
          state.Condenser.recirculationPumpValvePosition + action.payload.recirculationPumpValvePosition,
        ),
      )
      return {
        ...state,
        Condenser: {
          ...state.Condenser,
          recirculationPumpValvePosition,
        },
      }
    }
    case "SET_CONDENSATION_PUMP_VALVE_POSITION": {
      const condensationPumpValvePosition = Math.max(
        0,
        Math.min(
          1,
          state.Condenser.condensationPumpValvePosition + action.payload.condensationPumpValvePosition,
        ),
      )
      return {
        ...state,
        Condenser: {
          ...state.Condenser,
          condensationPumpValvePosition,
        },
      }
    }
    //#endregion
    //#region Turbine
    case "TOGGLE_MAIN_STEAM_VALVE":
      return {
        ...state,
        Turbine: {
          ...state.Turbine,
          // only open Main Steam Valve if pressure is above Minimum (pressure remains in Boiler)
          mainSteamValve:
            !state.Turbine.mainSteamValve && state.Boiler.pressure > CstTurbine.MainSteamValveMinimumPressure,
        },
      }
    case "ADJUST_STEAM_BYPASS_VALVE": {
      const bypassValvePosition = Math.max(
        0,
        Math.min(1, state.Turbine.bypassValvePosition + action.payload.bypassValvePosition),
      )
      return { ...state, Turbine: { ...state.Turbine, bypassValvePosition } }
    }
    case "ADJUST_STEAM_TURBINE_VALVE": {
      const turbineValvePosition = Math.max(
        0,
        Math.min(1, state.Turbine.turbineValvePosition + action.payload.turbineValvePosition),
      )
      return { ...state, Turbine: { ...state.Turbine, turbineValvePosition } }
    }
    case "ADJUST_RPM_SETPOINT": {
      const rpmSetPoint = Math.max(
        CstTurbine.MinRPM,
        Math.min(
          CstTurbine.MaxRPM,
          state.Turbine.rpmSetPoint + action.payload.rpmAdjustment
        )
      )
      return { ...state, Turbine: { ...state.Turbine, rpmSetPoint } }
    }
    case "TOGGLE_HOLD_MODE": {
      return {
        ...state,
        Turbine: {
          ...state.Turbine,
          holdMode: !state.Turbine.holdMode
        }
      }
    }
    //#endregion
    default:
      return state
  }
}
