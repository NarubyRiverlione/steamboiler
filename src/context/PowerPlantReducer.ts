import { CstPhysics, CstSimulation } from "./const"
import { calculateHeatingEnergy } from "../utils/boilerCalculations"
import { isAtSyncSpeed } from "../utils/turbineCalculations"
import PowerPlantAction from "./PowerPlantActions"
import PowerPlantState, { BoilerState, CondenserState, TurbineState } from "./PowerPlantState"
import PowerPlantTick from "./PowerPlantTick"

const { CstBoiler, CstTurbine } = CstSimulation

// Plant at rest with the boiler water at the given temperature (default: the UI's warm start)
export const makeInitialState = (temperature: number = CstBoiler.StartTemperature): PowerPlantState => ({
  Boiler: {
    waterVolume: CstBoiler.StartWaterVolume, // liters
    temperature, // Celsius
    pressure: 1, // bar
    gasFlow: 0, // liters/second
    drainValveOpen: false,
    drainedTotal: 0,
    energy: calculateHeatingEnergy(CstBoiler.StartWaterVolume, 0, temperature), // kJ
    energyDelta: 0, // kJ/s
    steamMass: 0, // kg - Mass of steam currently in the boiler
    deltaWaterVolume: 0,
    deltaSteamMass: 0,
    potentialSteamGeneration: 0, // kg/s - Maximum potential steam generation rate
  },
  Condenser: {
    pressure: CstPhysics.AtmosphericPressure_mBar, // mBar (initial atmospheric pressure)
    hotwellWaterVolume: CstSimulation.CstCondenser.HotwellStartVolume,
    hotwellTemperature: CstSimulation.CstCondenser.HotwellStartTemperature,
    steamMass: 0, // Start at 0
    intakeFlowRate: 0,
    returnRate: 0,
    condensationRate: 0,
    coolingRate: 1,
    isAirExtractionPumpEnabled: false,
    isSjaeEnabled: false,
    sjaeValvePosition: 0, // 0% open
    recirculationPumpValvePosition: 0, // 0% open
    condensationPumpValvePosition: 0,
    makeupValvePosition: 0,
    rejectValvePosition: 0,
    makeupTotal: 0,
    rejectTotal: 0,
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
    generatorBreaker: false, // Phase 4: Initially open
  },
})

export const initialPowerPlantState: PowerPlantState = makeInitialState()

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const withBoiler = (state: PowerPlantState, patch: Partial<BoilerState>): PowerPlantState => ({
  ...state,
  Boiler: { ...state.Boiler, ...patch },
})
const withCondenser = (state: PowerPlantState, patch: Partial<CondenserState>): PowerPlantState => ({
  ...state,
  Condenser: { ...state.Condenser, ...patch },
})
const withTurbine = (state: PowerPlantState, patch: Partial<TurbineState>): PowerPlantState => ({
  ...state,
  Turbine: { ...state.Turbine, ...patch },
})

type ActionType = PowerPlantAction["type"]
type Handler<T extends ActionType> = (
  state: PowerPlantState,
  action: Extract<PowerPlantAction, { type: T }>,
) => PowerPlantState

// One handler per action type; the mapped type makes a missing handler a compile error.
const handlers: { [T in ActionType]: Handler<T> } = {
  SIMULATE_TICK: (state) => PowerPlantTick(state),

  //#region Boiler
  INCREASE_GAS_FLOW: (state, { amount }) =>
    withBoiler(state, { gasFlow: Math.min(CstBoiler.MaxGasFlow, state.Boiler.gasFlow + amount) }),
  DECREASE_GAS_FLOW: (state, { amount }) => withBoiler(state, { gasFlow: Math.max(0, state.Boiler.gasFlow - amount) }),
  TOGGLE_DRAIN_VALVE: (state) => withBoiler(state, { drainValveOpen: !state.Boiler.drainValveOpen }),
  //#endregion

  //#region Condenser
  SET_AIR_EXTRACTION_PUMP_ENABLED: (state, { payload: { isAirExtractionPumpEnabled } }) =>
    withCondenser(state, { isAirExtractionPumpEnabled }),
  SET_SJAE_ENABLED: (state, { payload: { isSjaeEnabled } }) => withCondenser(state, { isSjaeEnabled }),
  SET_SJAE_VALVE_POSITION: (state, { payload }) =>
    withCondenser(state, {
      sjaeValvePosition: clamp(state.Condenser.sjaeValvePosition + payload.sjaeValvePosition, 0, 1),
    }),
  SET_RECIRCULATION_PUMP_VALVE_POSITION: (state, { payload }) =>
    withCondenser(state, {
      recirculationPumpValvePosition: clamp(
        state.Condenser.recirculationPumpValvePosition + payload.recirculationPumpValvePosition,
        0,
        1,
      ),
    }),
  SET_CONDENSATION_PUMP_VALVE_POSITION: (state, { payload }) =>
    withCondenser(state, {
      condensationPumpValvePosition: clamp(
        state.Condenser.condensationPumpValvePosition + payload.condensationPumpValvePosition,
        0,
        1,
      ),
    }),
  SET_MAKEUP_VALVE_POSITION: (state, { payload }) =>
    withCondenser(state, {
      makeupValvePosition: clamp(state.Condenser.makeupValvePosition + payload.makeupValvePosition, 0, 1),
    }),
  SET_REJECT_VALVE_POSITION: (state, { payload }) =>
    withCondenser(state, {
      rejectValvePosition: clamp(state.Condenser.rejectValvePosition + payload.rejectValvePosition, 0, 1),
    }),
  //#endregion

  //#region Turbine
  // only open Main Steam Valve if pressure is above Minimum (pressure remains in Boiler)
  TOGGLE_MAIN_STEAM_VALVE: (state) =>
    withTurbine(state, {
      mainSteamValve: !state.Turbine.mainSteamValve && state.Boiler.pressure > CstTurbine.MainSteamValveMinimumPressure,
    }),
  ADJUST_STEAM_BYPASS_VALVE: (state, { payload }) =>
    withTurbine(state, {
      bypassValvePosition: clamp(state.Turbine.bypassValvePosition + payload.bypassValvePosition, 0, 1),
    }),
  ADJUST_STEAM_TURBINE_VALVE: (state, { payload }) =>
    withTurbine(state, {
      turbineValvePosition: clamp(state.Turbine.turbineValvePosition + payload.turbineValvePosition, 0, 1),
    }),
  ADJUST_RPM_SETPOINT: (state, { payload }) =>
    withTurbine(state, {
      rpmSetPoint: clamp(state.Turbine.rpmSetPoint + payload.rpmAdjustment, CstTurbine.MinRPM, CstTurbine.MaxRPM),
    }),
  TOGGLE_HOLD_MODE: (state) => withTurbine(state, { holdMode: !state.Turbine.holdMode }),
  // Allow closing the breaker if RPM is within the margin of sync speed; toggling a closed breaker opens it
  TOGGLE_GENERATOR_BREAKER: (state) =>
    withTurbine(state, {
      generatorBreaker:
        !state.Turbine.generatorBreaker && isAtSyncSpeed(state.Turbine.rpm),
    }),
  //#endregion
}

export function powerPlantReducer(state: PowerPlantState, action: PowerPlantAction): PowerPlantState {
  // TS cannot correlate action.type with its payload when indexing a mapped type, hence the widening
  const handler = handlers[action.type] as (state: PowerPlantState, action: PowerPlantAction) => PowerPlantState
  return handler(state, action)
}
