import { CstDeaerator, CstPhysics, CstSimulation, CstTurningGear } from "./const"
import { deaeratorLevel, makeColdDeaerator } from "./Deaerator/DeaeratorTick"
import { calculateBoilerPressure, calculateHeatingEnergy, calculateSteamInventory, waterMassOf } from "../utils/boilerCalculations"
import { getBoilingPoint } from "../utils/steamTable"
import { airMassOf, hotwellLevel, vapourPressureAt } from "../utils/condenserCalculation"
import { isAboveMainSteamValveMinimum, generatorBreakerCloseRefusal, loadSetpointRefusal, maxTurbineValvePosition, runUpPointRefusal, speedModeRefusal } from "../utils/turbineCalculations"
import PowerPlantAction from "./PowerPlantActions"
import PowerPlantState, { BoilerState, CondenserState, DeaeratorState, TurbineState } from "./PowerPlantState"
import PowerPlantTick from "./PowerPlantTick"
import { runTicks } from "./PowerPlantBatch"
import { integralFor } from "./Boiler/Attemperator"
import { isAtBoilerHighHigh, isBelowBurnerLowLow, metalEnergyOf } from "./Boiler/BoilerTick"
import { resetTrip } from "./tripReset"
import { houseLoadRefusal, isBusLive } from "./AuxiliaryBus"
import { dieselBreakerCloseRefusal, openDieselBreaker } from "./Diesel"
import { isSafetyBusLive, isVitalBusLive } from "./SafetyBus"
import { turningGearRefusal } from "./Turbine/TurningGear"
import { isOpeningRefused } from "./Turbine/ValveOpening"
import { glandSteamRefusal } from "./Turbine/GlandSteam"

const { CstBoiler, CstCondenser, CstTurbine } = CstSimulation

const { AmbientTemperature } = CstPhysics

// Initial fills are specified in litres at ambient and held as kg
const startHotwellMass: number = waterMassOf(
  CstSimulation.CstCondenser.HotwellStartVolume,
  AmbientTemperature,
)

// Truly cold plant: everything at ambient temperature and atmospheric pressure, all pumps, valves and gas off.
// The headless scenarios start with the 35% drum; the app starts with makeUiStartState (40%)
export const makeInitialState = (boilerStartVolume: number = CstBoiler.StartWaterVolume): PowerPlantState => ({
  Boiler: {
    waterMass: waterMassOf(boilerStartVolume, AmbientTemperature), // kg, the start volume (litres at ambient) converted
    waterVolume: boilerStartVolume, // liters, derived
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
    steamTemperature: getBoilingPoint(calculateBoilerPressure(AmbientTemperature)), // Celsius, saturation: no steam flow yet (ADR 0044)
    superheaterHeat: 0, // kW
    sprayValvePosition: 0,
    sprayFlow: 0, // kg/s
    attemperatorAuto: true,
    attemperatorIntegralError: 0,
    energy:
      calculateHeatingEnergy(waterMassOf(boilerStartVolume, AmbientTemperature), 0, AmbientTemperature) + metalEnergyOf(AmbientTemperature), // kJ above 0 °C, water and metal
    energyDelta: 0, // kJ/s
    heatLoss: 0, // kW
    heatingRate: 0, // K/s
    heatingRateOverLimit: false,
    steamMass: calculateSteamInventory(AmbientTemperature, boilerStartVolume), // kg - vapour over the water, in equilibrium
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
    airPumpTripped: false,
    sealWaterTemperature: CstSimulation.CstCondenser.RecirculationPump_IntakeTemperature, // Celsius: in step with the cooling water at rest
    sealWaterCoolerOn: true,
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
  Deaerator: makeColdDeaerator(), // filled cold to 50% at ambient (ADR 0037)
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
    turningGearEngaged: false,
    glandSteamOn: false, // the glands unsealed (ADR 0047)
  },
  Oil: { pumpRunning: false, headerPressure: 0 }, // bar g: the pump stopped, the header empty (ADR 0050)
  Diesel: { status: "stopped", startElapsed: 0 },
  dieselBreaker: false,
  gridSupplyBreaker: true, // closed: the grid feeds the auxiliary bus (#141)
  // The UPS breaker is closed here so every scenario runs as before; the app (makeUiStartState) and dark-start open it
  upsBreaker: true,
  upsCharge: 100,
  simulationEnded: false,
  auxiliaryLoad: 0, // MW: no pump runs
})

// What the app starts from: the cold plant with the drum filled to 40% (ADR 0018)
// The UPS breaker starts open: the operator closes it from the Auxiliary bus page (ADR 0055); scenarios and snapshots keep makeInitialState
export const makeUiStartState = (): PowerPlantState => ({ ...makeInitialState(CstBoiler.UiStartWaterVolume), upsBreaker: false })

export const initialPowerPlantState: PowerPlantState = makeUiStartState()

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
  // The only thing that clears a latched trip, and only once its cause has gone (ADR 0043)
  RESET_TRIP: (state, { payload: { trip } }) => (isSafetyBusLive(state) ? resetTrip(state, trip) : state), // the reset coil needs the safety bus (#143)

  //#region Boiler
  // Sets the knob. Turning it up is refused (knob stays centred) while the burner is tripped or the water is below the
  // burner low-low level; only a trip reset lifts the trip, then a raise past the dead zone ramps the gas up from 0 (ADR 0017, 0043)
  SET_GAS_RATE: (state, { payload }) => {
    const command: number = clamp(payload.gasRateCommand, -1, 1)
    const raising: boolean = command > CstBoiler.GasRateDeadZone
    if (raising && (state.Boiler.burnerTripped || isBelowBurnerLowLow(state.Boiler))) return state
    return withBoiler(state, { gasRateCommand: command })
  },
  TOGGLE_DRAIN_VALVE: (state) => withBoiler(state, { drainValveOpen: !state.Boiler.drainValveOpen }),
  //#endregion

  //#region Deaerator
  // The start-up vent is an operator action; the warning flags follow at the next tick
  TOGGLE_DEAERATOR_VENT: (state) => withDeaerator(state, { startUpVentOpen: !state.Deaerator.startUpVentOpen }),
  // While a feed pump or boiler high-high trip is latched, below the deaerator low-low or at the boiler high-high level the
  // feed pump may not be opened, closing is always allowed; only a trip reset clears the flags (ADR 0041, 0043)
  SET_FEED_PUMP_VALVE_POSITION: (state, { payload }) => {
    const { feedPumpValvePosition: current, feedPumpTripped, waterVolume } = state.Deaerator
    const { boilerLevelHighTripped } = state.Boiler
    const requested: number = clamp(current + payload.feedPumpValvePosition, 0, 1)
    const opening: boolean = requested > current
    const refused: boolean = feedPumpTripped || boilerLevelHighTripped || deaeratorLevel(waterVolume) < CstDeaerator.LowLowLevel || isAtBoilerHighHigh(state.Boiler)
    if (opening && refused) return state
    return withDeaerator(state, { feedPumpValvePosition: requested })
  },
  //#endregion

  //#region Attemperator
  // Auto holds the steam temperature with the PID; switching to Auto carries the valve position over (bumpless, ADR 0044)
  SET_ATTEMPERATOR_AUTO: (state, { payload: { attemperatorAuto } }) =>
    withBoiler(state, {
      attemperatorAuto,
      attemperatorIntegralError: attemperatorAuto ? integralFor(state.Boiler.sprayValvePosition) : state.Boiler.attemperatorIntegralError,
    }),
  // The operator moves the spray valve by this change, in Manual only; in Auto the PID owns it
  SET_SPRAY_VALVE_POSITION: (state, { payload: { sprayValvePosition } }) =>
    state.Boiler.attemperatorAuto
      ? state
      : withBoiler(state, { sprayValvePosition: clamp(state.Boiler.sprayValvePosition + sprayValvePosition, 0, 1) }),
  //#endregion

  //#region Condenser
  // A tripped pump may not be started, stopping is always allowed; only a trip reset clears the flag (ADR 0043)
  SET_AIR_EXTRACTION_PUMP_ENABLED: (state, { payload: { isAirExtractionPumpEnabled } }) =>
    isAirExtractionPumpEnabled && state.Condenser.airPumpTripped ? state : withCondenser(state, { isAirExtractionPumpEnabled }),
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
  // Tripped, below hotwell low-low or at the deaerator high-high level (ADR 0045) the pump may not be opened, closing is always allowed; only a trip reset clears the flag (ADR 0043)
  SET_CONDENSATION_PUMP_VALVE_POSITION: (state, { payload }) => {
    const { condensationPumpValvePosition: current, condensationPumpTripped, hotwellWaterVolume } = state.Condenser
    const { deaeratorHighHighTripped, waterVolume } = state.Deaerator
    const requested = clamp(current + payload.condensationPumpValvePosition, 0, 1)
    const refused: boolean =
      condensationPumpTripped ||
      hotwellLevel(hotwellWaterVolume) < CstCondenser.HotwellLowLow ||
      deaeratorHighHighTripped ||
      deaeratorLevel(waterVolume) >= CstDeaerator.HighHighLevel
    if (requested > current && refused) return state
    return withCondenser(state, { condensationPumpValvePosition: requested })
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

  //#region Grid supply breaker (#141)
  // Breaker control power is the safety bus: with it dead the command does nothing (#143, ADR 0053)
  CLOSE_GRID_SUPPLY_BREAKER: (state) => (isSafetyBusLive(state) ? { ...state, gridSupplyBreaker: true } : state),
  OPEN_GRID_SUPPLY_BREAKER: (state) => (!isSafetyBusLive(state) ? state : { ...state, gridSupplyBreaker: false }),
  //#endregion

  //#region Onsite diesel generator (#169): starting needs no plant bus; the breaker needs the safety bus, the local trip does not
  SET_DIESEL_RUN: (state, { payload: { run } }) => {
    if (run) return state.Diesel.status === "stopped" ? { ...state, Diesel: { status: "starting", startElapsed: 0 } } : state
    return { ...openDieselBreaker(state), Diesel: { status: "stopped", startElapsed: 0 } }
  },
  CLOSE_DIESEL_BREAKER: (state) => (!isSafetyBusLive(state) || dieselBreakerCloseRefusal(state) ? state : { ...state, dieselBreaker: true }),
  OPEN_DIESEL_BREAKER: (state) => (isSafetyBusLive(state) ? openDieselBreaker(state) : state),
  LOCAL_TRIP_DIESEL_BREAKER: (state) => openDieselBreaker(state),
  //#endregion

  //#region UPS breaker (#143): the one control that needs no power
  CLOSE_UPS_BREAKER: (state) => ({ ...state, upsBreaker: true }),
  OPEN_UPS_BREAKER: (state) => ({ ...state, upsBreaker: false }),
  //#endregion

  //#region Oil
  SET_OIL_PUMP: (state, { payload: { pumpRunning } }) => ({ ...state, Oil: { ...state.Oil, pumpRunning } }),
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
  // Tripped, above the vacuum limit (ADR 0003) or at the overspeed limit (ADR 0040) the turbine may not take more steam: an
  // opening is refused, closing is always allowed; only a trip reset clears the flag (ADR 0043)
  ADJUST_STEAM_TURBINE_VALVE: (state, { payload }) => {
    const current: number = state.Turbine.turbineValvePosition
    const requested: number = clamp(current + payload.turbineValvePosition, 0, 1)
    if (requested > maxTurbineValvePosition(current, state.Condenser.pressure)) return state
    if (requested > current && isOpeningRefused(state.Turbine, state.Oil)) return state
    return withTurbine(state, { turbineValvePosition: requested })
  },
  // Engaging is refused without oil or above the standstill speed; disengaging is always allowed (ADR 0051)
  // A rotor at gear speed stops when the gear lets go: the loss torque is ∝ rpm², so the model would coast it for hours
  SET_TURNING_GEAR: (state, { payload: { engaged } }) => {
    if (engaged && turningGearRefusal(state.Turbine, state.Oil, isBusLive(state))) return state
    const { rpm } = state.Turbine
    return withTurbine(state, { turningGearEngaged: engaged, rpm: !engaged && rpm <= CstTurningGear.Rpm ? 0 : rpm })
  },
  // Admitting is refused while the rotor is not turning (steam on a stationary rotor bows it); shutting off is always allowed (ADR 0047)
  SET_GLAND_STEAM: (state, { payload: { on } }) =>
    on && glandSteamRefusal(state.Turbine) ? state : withTurbine(state, { glandSteamOn: on }),
  // Refusals are in speedModeRefusal and runUpPointRefusal: a refused change leaves the state as it is (ADR 0021)
  SET_SPEED_MODE: (state, { payload: { speedMode } }) => {
    if (!isVitalBusLive(state) || speedModeRefusal(state.Turbine, speedMode)) return state
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
    if (!isVitalBusLive(state) || runUpPointRefusal(state.Turbine, runUpPoint)) return state
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
  // Closing enters Synchronised (PID on 3000 rpm); opening, by hand, returns to Free (#135)
  TOGGLE_GENERATOR_BREAKER: (state) => {
    if (!isSafetyBusLive(state)) return state
    const { rpm, generatorBreaker: wasClosed } = state.Turbine
    if (wasClosed) return withTurbine(state, { generatorBreaker: false, electricOutput: 0, loadSetpoint: 0, ...freeAt(rpm) })
    if (generatorBreakerCloseRefusal(state.Turbine)) return state
    return withTurbine(state, { generatorBreaker: true, speedMode: "synchronised", runUpPoint: CstTurbine.SyncRPM, speedReference: CstTurbine.SyncRPM, pidIntegralError: 0 })
  },
  // Only with the breaker closed (loadSetpointRefusal) and not in house load operation (the setpoint is ignored there, #182); limited to 0 up to LoadSetpointLimit. The load follows at the load rate.
  SET_LOAD_SETPOINT: (state, { payload: { loadSetpoint } }) =>
    !isVitalBusLive(state) || loadSetpointRefusal(state.Turbine) || houseLoadRefusal(state) ? state : withTurbine(state, { loadSetpoint: clamp(loadSetpoint, 0, CstTurbine.LoadSetpointLimit) }),
  //#endregion
}

// Back to Free: the integral is cleared and the reference follows the speed
const freeAt = (rpm: number): Pick<TurbineState, "speedMode" | "pidIntegralError" | "speedReference"> => ({
  speedMode: "free",
  pidIntegralError: 0,
  speedReference: rpm,
})

export function powerPlantReducer(state: PowerPlantState, action: PowerPlantAction): PowerPlantState {
  // TS cannot correlate action.type with its payload when indexing a mapped type, hence the widening
  const handler = handlers[action.type] as (
    state: PowerPlantState,
    action: PowerPlantAction,
  ) => PowerPlantState
  return handler(state, action)
}
