type BoilerState = {
  waterVolume: number // liters
  deltaWaterVolume: number
  temperature: number // Celsius
  pressure: number // bar
  gasFlow: number // liters/second
  fillValveOpen: boolean
  drainValveOpen: boolean
  energy: number // kJ
  energyDelta: number // kJ/s
  steamMass: number // kg - Mass of steam currently in the boiler
  mainSteamValve: boolean // open/close MSV
  bypassValvePosition: number // 0-100% open
  bypassSteamFlowOut: number // g/s
  turbineValvePosition: number // 0-100% open
  turbineSteamFlowOut: number // g/s
}

export type BoilerAction =
  | { type: "INCREASE_GAS_FLOW"; amount: number }
  | { type: "DECREASE_GAS_FLOW"; amount: number }
  | { type: "TOGGLE_FILL_VALVE" }
  | { type: "TOGGLE_DRAIN_VALVE" }
  | { type: "TOGGLE_MAIN_STEAM_VALVE" }
  | { type: "ADJUST_STEAM_BYPASS_VALVE"; amount: number }
  | { type: "ADJUST_STEAM_TURBINE_VALVE"; amount: number }
  | { type: "ADD_CONDENSATION_WATER"; amount: number }
  | { type: "SIMULATE_TICK" }

export default BoilerState
