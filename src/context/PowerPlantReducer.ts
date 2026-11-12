import { CstDeaerator, CstPhysics, CstSimulation } from "./const"
import { deaeratorLevel, makeColdDeaerator } from "./Deaerator/DeaeratorTick"
import { calculateHeatingEnergy, calculateSteamInventory, waterMassOf } from "../utils/boilerCalculations"
import { airMassOf, hotwellLevel, vapourPressureAt } from "../utils/condenserCalculation"
import { isAboveMainSteamValveMinimum, isAtOverspeed, isAtSyncSpeed, loadSetpointRefusal, maxTurbineValvePosition, runUpPointRefusal, speedModeRefusal, turbineTrippedAfter } from "../utils/turbineCalculations"
import PowerPlantAction from "./PowerPlantActions"
import PowerPlantState, { BoilerState, CondenserState, DeaeratorState, TurbineState } from "./PowerPlantState"
import PowerPlantTick from "./PowerPlantTick"
import { runTicks } from "./PowerPlantBatch"
import { isAtBoilerHighHigh, isBelowBurnerLowLow, metalEnergyOf } from "./Boiler/BoilerTick"

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
    gasRateCommand: 0, // knob centred
    drainValveOpen: false,
    drainedTotal: 0,
    reliefValveOpen: false,
    ventedTotal: 0, // kg
    reliefLifts: 0,
    burnerTripped: false,
    boilerLevelHighTripped: false,
    stackTemperature: AmbientTemperature, // Celsius, no gas burning
    boilerEfficiency: 0,
    returnTemperatureOut: AmbientTemperature, // Celsius
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
    // kg: the shell full of air at atmospheric pressure, less the vapour of the ambient hotwell (Cold state, ADR 0035)
    airMass: airMassOf(CstPhysics.AtmosphericPressure_mBar - vapourPressureAt(AmbientTemperature), AmbientTemperature),
    ventedTotal: 0,
    intakeFlowRate: 0,
    returnRate: 0,
    condensationRate: 0,
    coolingRate: 1,
    coolingWaterOutletTemperature: CstSimulation.CstCondenser.RecirculationPump_IntakeTemperature,
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
  Deaerator: makeColdDeaerator(), // filled cold to 38% at ambient (ADR 0037)
  Heater: {
    extractionFlow: 0, // kg/s
    tapPressure: 0, // bar
    heaterPressure: 0, // bar
    returnTemperature: AmbientTemperature, // Celsius
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
const withDeaerator = (state: PowerPlantState, patch: Partial<DeaeratorState>): PowerPlantState => ({
  ...state,
  Deaerator: { ...state.Deaerator, ...patch },
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
  SIMULATE_TICKS: (state, { count }) => runTicks(state, count).state,
  LOAD_STATE: (_state, { payload: { state } }) => state,

  //#region Boiler
  // Sets the knob. Turning it up is refused (knob stays centred) while the water is below the burner low-low level; a
  // raise past the dead zone above that level clears the trip and the gas ramps up from 0 (ADR 0017)
  SET_GAS_RATE: (state, { payload }) => {
    const command: number = clamp(payload.gasRateCommand, -1, 1)
    const raising: boolean = command > CstBoiler.GasRateDeadZone
    if (raising && isBelowBurnerLowLow(state.Boiler)) return state
    return withBoiler(state, {
      gasRateCommand: command,
      burnerTripped: state.Boiler.burnerTripped && !raising,
    })
  },
  TOGGLE_DRAIN_VALVE: (state) => withBoiler(state, { drainValveOpen: !state.Boiler.drainValveOpen }),
  //#endregion

  //#region Deaerator
  // The start-up vent is an operator action; the warning flags follow at the next tick
  TOGGLE_DEAERATOR_VENT: (state) => withDeaerator(state, { startUpVentOpen: !state.Deaerator.startUpVentOpen }),
  // Below the deaerator low-low or at the boiler high-high level the feed pump may not be opened, closing is always allowed;
  // an opening clears both trip flags (ADR 0041)
  SET_FEED_PUMP_VALVE_POSITION: (state, { payload }) => {
    const { feedPumpValvePosition: current, feedPumpTripped, waterVolume } = state.Deaerator
    const requested: number = clamp(current + payload.feedPumpValvePosition, 0, 1)
    const opening: boolean = requested > current
    if (opening && (deaeratorLevel(waterVolume) < CstDeaerator.LowLowLevel || isAtBoilerHighHigh(state.Boiler))) return state
    const next: PowerPlantState = withDeaerator(state, { feedPumpValvePosition: requested, feedPumpTripped: feedPumpTripped && !opening })
    return opening ? withBoiler(next, { boilerLevelHighTripped: false }) : next
  },
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
      mainSteamValve: !state.Turbine.mainSteamValve && isAboveMainSteamValveMinimum(state.Boiler.pressure),
    }),
  ADJUST_STEAM_BYPASS_VALVE: (state, { payload }) =>
    withTurbine(state, {
      bypassValvePosition: clamp(state.Turbine.bypassValvePosition + payload.bypassValvePosition, 0, 1),
    }),
  // Above the vacuum limit (ADR 0003) or at the overspeed limit (ADR 0040) the turbine may not take more steam: an opening is refused, closing is always allowed
  ADJUST_STEAM_TURBINE_VALVE: (state, { payload }) => {
    const { turbineValvePosition: current, turbineTripped, rpm } = state.Turbine
    const requested = clamp(current + payload.turbineValvePosition, 0, 1)
    if (requested > maxTurbineValvePosition(current, state.Condenser.pressure)) return state
    // At or above the overspeed limit the turbine may not take more steam either (ADR 0040)
    if (requested > current && isAtOverspeed(rpm)) return state
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
  // Whenever the breaker ends up open, the load and the load setpoint are 0 (ADR 0027)
  TOGGLE_GENERATOR_BREAKER: (state) => {
    const generatorBreaker: boolean = !state.Turbine.generatorBreaker && isAtSyncSpeed(state.Turbine.rpm)
    return withTurbine(state, generatorBreaker ? { generatorBreaker } : { generatorBreaker, electricOutput: 0, loadSetpoint: 0 })
  },
  // Only with the breaker closed (loadSetpointRefusal); limited to 0 up to LoadSetpointLimit. The load follows at the load rate.
  SET_LOAD_SETPOINT: (state, { payload: { loadSetpoint } }) =>
    loadSetpointRefusal(state.Turbine) ? state : withTurbine(state, { loadSetpoint: clamp(loadSetpoint, 0, CstTurbine.LoadSetpointLimit) }),
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
