import PowerPlantState, { SpeedMode } from "./PowerPlantState"
import type { TripId } from "./tripReset"

type PowerPlantAction =
  | { type: "SIMULATE_TICK" }
  | { type: "SIMULATE_TICKS"; count: number } // a batch of fixed ticks, one render
  // Replaces the whole plant state (a UI preset)
  | { type: "LOAD_STATE"; payload: { state: PowerPlantState } }
  // Clears one latched trip once its cause has gone; a no-op otherwise (ADR 0043)
  | { type: "RESET_TRIP"; payload: { trip: TripId } }
  // Boiler Actions
  | { type: "SET_GAS_RATE"; payload: { gasRateCommand: number } } // the gas knob, -1 to 1 (#15)
  | { type: "TOGGLE_DRAIN_VALVE" }
  // Attemperator Actions (#113): Auto holds the steam temperature; in Manual the valve moves by the change (-1 to 1)
  | { type: "SET_ATTEMPERATOR_AUTO"; payload: { attemperatorAuto: boolean } }
  | { type: "SET_SPRAY_VALVE_POSITION"; payload: { sprayValvePosition: number } }
  // Turbine RPM Control Actions
  | { type: "TOGGLE_MAIN_STEAM_VALVE" }
  | { type: "ADJUST_STEAM_BYPASS_VALVE"; payload: { bypassValvePosition: number } }
  | { type: "ADJUST_STEAM_TURBINE_VALVE"; payload: { turbineValvePosition: number } }
  | { type: "SET_SPEED_MODE"; payload: { speedMode: SpeedMode } }
  | { type: "SELECT_RUN_UP_POINT"; payload: { runUpPoint: number } }
  | { type: "TOGGLE_GENERATOR_BREAKER" }
  | { type: "SET_LOAD_SETPOINT"; payload: { loadSetpoint: number } }
  // Grid supply breaker Actions (#141, ADR 0053): both always allowed; closing it opens the unit aux breaker (#189)
  | { type: "CLOSE_GRID_SUPPLY_BREAKER" }
  | { type: "OPEN_GRID_SUPPLY_BREAKER" }
  // Local mechanical trips (#184, ADR 0053): work with no safety bus, only open
  | { type: "LOCAL_TRIP_GRID_SUPPLY_BREAKER" }
  // Unit aux breaker Actions (#189, ADR 0053): close is refused outside the ±2 rpm window and, with the grid supply closed, opens it on the same tick; open is never refused
  | { type: "CLOSE_UNIT_AUX_BREAKER" }
  | { type: "OPEN_UNIT_AUX_BREAKER" }
  | { type: "LOCAL_TRIP_GENERATOR_BREAKER" }
  // Onsite diesel Actions (#169): start/stop; close is refused with a reason (dieselBreakerCloseRefusal), open is never refused;
  // the local trip only opens and needs no control power
  | { type: "SET_DIESEL_RUN"; payload: { run: boolean } }
  | { type: "CLOSE_DIESEL_BREAKER" }
  | { type: "OPEN_DIESEL_BREAKER" }
  | { type: "LOCAL_TRIP_DIESEL_BREAKER" }
  // Battery (UPS) breaker Actions (#143): manual, always available, even on a dead safety bus
  | { type: "CLOSE_UPS_BREAKER" }
  | { type: "OPEN_UPS_BREAKER" }
  // Lube oil Action (ADR 0050): the oil pump on or off
  | { type: "SET_OIL_PUMP"; payload: { pumpRunning: boolean } }
  // Turning gear Action (ADR 0051): engage or disengage by hand
  | { type: "SET_TURNING_GEAR"; payload: { engaged: boolean } }
  // Gland seal steam Action (ADR 0047): on or off; on is refused while the rotor is not turning
  | { type: "SET_GLAND_STEAM"; payload: { on: boolean } }
  // Deaerator Actions
  | { type: "TOGGLE_DEAERATOR_VENT" } // the manual start-up vent, open or closed
  | { type: "SET_FEED_PUMP_VALVE_POSITION"; payload: { feedPumpValvePosition: number } } // the boiler feed pump (#112)
  // Condenser Actions
  | { type: "SET_AIR_EXTRACTION_PUMP_ENABLED"; payload: { isAirExtractionPumpEnabled: boolean } }
  | { type: "SET_SJAE_ENABLED"; payload: { isSjaeEnabled: boolean } }
  | { type: "SET_SJAE_VALVE_POSITION"; payload: { sjaeValvePosition: number } }
  | { type: "SET_RECIRCULATION_PUMP_VALVE_POSITION"; payload: { recirculationPumpValvePosition: number } }
  | { type: "SET_CONDENSATION_PUMP_VALVE_POSITION"; payload: { condensationPumpValvePosition: number } }
  | { type: "SET_MAKEUP_VALVE_POSITION"; payload: { makeupValvePosition: number } }
  | { type: "SET_REJECT_VALVE_POSITION"; payload: { rejectValvePosition: number } }

export default PowerPlantAction
