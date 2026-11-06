import { CstPhysics, CstSimulation } from "./const"
import { calculateHeatingEnergy, calculateSteamInventory, waterMassOf } from "../utils/boilerCalculations"
import { hotwellLevel } from "../utils/condenserCalculation"
import { isAtSyncSpeed, loadSetpointRefusal, maxTurbineValvePosition, ratedOutputMW, runUpPointRefusal, speedModeRefusal, turbineTrippedAfter } from "../utils/turbineCalculations"
import PowerPlantAction from "./PowerPlantActions"
import PowerPlantState, { BoilerState, CondenserState, TurbineState } from "./PowerPlantState"
import PowerPlantTick from "./PowerPlantTick"
import { isBelowBurnerLowLow, metalEnergyOf } from "./Boiler/BoilerTick"

const { CstBoiler, CstCondenser, CstTurbine } = CstSimulation

const { AmbientTemperature } = CstPhysics

// Initial fills are specified in litres at ambient and held as kg
const startBoilerMass: number = waterMassOf(CstBoiler.StartWaterVolume, AmbientTemperature)
const startHotwellMass: number = waterMassOf(
  CstSimulation.CstCondenser.HotwellStartVolume,
  AmbientTemperature,
)

// Truly cold plant: everything at ambient temperature and atmospheric pressure, all pumps, valves and gas off
export const makeInitialState = (): PowerPlantState => ({
  Boiler: {
    waterMass: startBoilerMass, // kg, the start volume (litres at ambient) converted
    waterVolume: CstBoiler.StartWaterVolume, // liters, derived
    deltaWaterMass: 0,
    temperature: AmbientTemperature, // Celsius
    pressure: CstPhysics.AtmosphericPressure_mBar / 1e3, // bar
    gasFlow: 0, // liters/second
    drainValveOpen: false,
    drainedTotal: 0,
    reliefValveOpen: false,
    ventedTotal: 0, // kg
    reliefLifts: 0,
    burnerTripped: false,
    energy:
      calculateHeatingEnergy(startBoilerMass, 0, AmbientTemperature) + metalEnergyOf(AmbientTemperature), // kJ above 0 °C, water and metal
    energyDelta: 0, // kJ/s
    heatLoss: 0, // kW
    heatingRate: 0, // K/s
    heatingRateOverLimit: false,
    steamMass: calculateSteamInventory(AmbientTemperature, CstBoiler.StartWaterVolume), // kg - vapour over the water, in equilibrium
    deltaSteamMass: 0,
  },
  Condenser: {
    pressure: CstPhysics.AtmosphericPressure_mBar, // mBar (initial atmospheric pressure)
    hotwellWaterMass: startHotwellMass,
    hotwellWaterVolume: CstSimulation.CstCondenser.HotwellStartVolume,
    hotwellTemperature: AmbientTemperature, // Celsius
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
    condensationPumpTripped: false,
    makeupValvePosition: 0,
    rejectValvePosition: 0,
    makeupTotal: 0,
    rejectTotal: 0,
    deltaWaterMass: 0,
  },
  Turbine: {
    electricOutput: 0, // MW,
    loadSetpoint: 0, // MW
    bypassValvePosition: 0,
    bypassSteamFlowOut: 0,
    turbineValvePosition: 0,
    turbineSteamFlowOut: 0,
    mainSteamValve: false, // closed
    rpm: 0,
    runUpPoint: CstTurbine.DefaultRunUpPoint,
    speedMode: "free",
    speedReference: 0,
    generatorBreaker: false, // Phase 4: Initially open
    pidIntegralError: 0,
    turbineTripped: false,
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
  // Refused while the water is below the burner low-low level; the next successful raise clears the trip
  INCREASE_GAS_FLOW: (state, { amount }) =>
    isBelowBurnerLowLow(state.Boiler)
      ? state
      : withBoiler(state, {
          gasFlow: Math.min(CstBoiler.MaxGasFlow, state.Boiler.gasFlow + amount),
          burnerTripped: false,
        }),
  DECREASE_GAS_FLOW: (state, { amount }) =>
    withBoiler(state, { gasFlow: Math.max(0, state.Boiler.gasFlow - amount) }),
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
  // Below low-low the pump may not be opened, closing is always allowed; an opening clears the trip flag
  SET_CONDENSATION_PUMP_VALVE_POSITION: (state, { payload }) => {
    const { condensationPumpValvePosition: current, condensationPumpTripped, hotwellWaterVolume } = state.Condenser
    const requested = clamp(current + payload.condensationPumpValvePosition, 0, 1)
    if (requested > current && hotwellLevel(hotwellWaterVolume) < CstCondenser.HotwellLowLow) return state
    return withCondenser(state, {
      condensationPumpValvePosition: requested,
      condensationPumpTripped: condensationPumpTripped && requested <= current,
    })
  },
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
      mainSteamValve:
        !state.Turbine.mainSteamValve && state.Boiler.pressure > CstTurbine.MainSteamValveMinimumPressure,
    }),
  ADJUST_STEAM_BYPASS_VALVE: (state, { payload }) =>
    withTurbine(state, {
      bypassValvePosition: clamp(state.Turbine.bypassValvePosition + payload.bypassValvePosition, 0, 1),
    }),
  // Above the vacuum limit the turbine may not take more steam: an opening is refused, closing is always allowed (ADR 0003)
  ADJUST_STEAM_TURBINE_VALVE: (state, { payload }) => {
    const { turbineValvePosition: current, turbineTripped } = state.Turbine
    const requested = clamp(current + payload.turbineValvePosition, 0, 1)
    if (requested > maxTurbineValvePosition(current, state.Condenser.pressure)) return state
    return withTurbine(state, {
      turbineValvePosition: requested,
      turbineTripped: turbineTrippedAfter(turbineTripped, current, requested),
    })
  },
  // Refusals are in speedModeRefusal and runUpPointRefusal: a refused change leaves the state as it is (ADR 0021)
  SET_SPEED_MODE: (state, { payload: { speedMode } }) => {
    if (speedModeRefusal(state.Turbine, speedMode)) return state
    const { rpm, runUpPoint } = state.Turbine
    if (speedMode === "free") return withTurbine(state, { speedMode })
    return withTurbine(state, {
      speedMode,
      speedReference: speedMode === "hold" ? runUpPoint : rpm,
      pidIntegralError: 0,
    })
  },
  // In Free a point only selects the target; in Ramp up or Hold a point above the speed (re)starts Ramp up toward it,
  // and a running ramp keeps its reference
  SELECT_RUN_UP_POINT: (state, { payload: { runUpPoint } }) => {
    if (runUpPointRefusal(state.Turbine, runUpPoint)) return state
    const { speedMode, rpm, speedReference, pidIntegralError } = state.Turbine
    if (speedMode === "free") return withTurbine(state, { runUpPoint })
    const ramping: boolean = speedMode === "rampUp"
    return withTurbine(state, {
      runUpPoint,
      speedMode: "rampUp",
      speedReference: ramping ? speedReference : rpm,
      pidIntegralError: ramping ? pidIntegralError : 0,
    })
  },
  // Allow closing the breaker if RPM is within the margin of sync speed; toggling a closed breaker opens it
  // Whenever the breaker ends up open, the load and the load setpoint are 0 (ADR 0026)
  TOGGLE_GENERATOR_BREAKER: (state) => {
    const generatorBreaker: boolean = !state.Turbine.generatorBreaker && isAtSyncSpeed(state.Turbine.rpm)
    return withTurbine(state, generatorBreaker ? { generatorBreaker } : { generatorBreaker, electricOutput: 0, loadSetpoint: 0 })
  },
  // Only with the breaker closed (loadSetpointRefusal); limited to 0 up to the rated output. The load follows at the load rate.
  SET_LOAD_SETPOINT: (state, { payload: { loadSetpoint } }) =>
    loadSetpointRefusal(state.Turbine) ? state : withTurbine(state, { loadSetpoint: clamp(loadSetpoint, 0, ratedOutputMW) }),
  //#endregion
}

export function powerPlantReducer(state: PowerPlantState, action: PowerPlantAction): PowerPlantState {
  // TS cannot correlate action.type with its payload when indexing a mapped type, hence the widening
  const handler = handlers[action.type] as (
    state: PowerPlantState,
    action: PowerPlantAction,
  ) => PowerPlantState
  return handler(state, action)
}
