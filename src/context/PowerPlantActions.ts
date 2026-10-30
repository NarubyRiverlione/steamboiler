type PowerPlantAction =
  | { type: "SIMULATE_TICK" } //  payload: { previousSteamMass: number }
  // Boiler Actions
  | { type: "INCREASE_GAS_FLOW"; amount: number }
  | { type: "DECREASE_GAS_FLOW"; amount: number }
  | { type: "TOGGLE_DRAIN_VALVE" }
  // Turbine RPM Control Actions
  | { type: "TOGGLE_MAIN_STEAM_VALVE" }
  | { type: "ADJUST_STEAM_BYPASS_VALVE"; payload: { bypassValvePosition: number } }
  | { type: "ADJUST_STEAM_TURBINE_VALVE"; payload: { turbineValvePosition: number } }
  | { type: "ADJUST_RPM_SETPOINT"; payload: { rpmAdjustment: number } }
  | { type: "TOGGLE_HOLD_MODE" }
  | { type: "TOGGLE_GENERATOR_BREAKER" }
  // Condenser Actions
  | { type: "SET_AIR_EXTRACTION_PUMP_ENABLED"; payload: { isAirExtractionPumpEnabled: boolean } }
  | { type: "SET_SJAE_ENABLED"; payload: { isSjaeEnabled: boolean } }
  | { type: "SET_SJAE_VALVE_POSITION"; payload: { sjaeValvePosition: number } }
  | { type: "SET_RECIRCULATION_PUMP_VALVE_POSITION"; payload: { recirculationPumpValvePosition: number } }
  | { type: "SET_CONDENSATION_PUMP_VALVE_POSITION"; payload: { condensationPumpValvePosition: number } }
  | { type: "SET_MAKEUP_VALVE_POSITION"; payload: { makeupValvePosition: number } }
  | { type: "SET_REJECT_VALVE_POSITION"; payload: { rejectValvePosition: number } }

export default PowerPlantAction
