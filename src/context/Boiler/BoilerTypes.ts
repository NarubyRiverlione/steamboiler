type BoilerState = {
  gasFlow: number // liters/second
  waterVolume: number // liters
  deltaWaterVolume: number
  temperature: number // Celsius
  pressure: number // bar
  energy: number // kJ
  steamMass: number // kg - Mass of steam currently in the boiler
  deltaSteamMass: number // kg/s generated steam
  energyDelta: number // kJ/s
  fillValveOpen: boolean
  drainValveOpen: boolean
  mainSteamValve: boolean // open/close MSV
  bypassValvePosition: number // 0-100% open
  bypassSteamFlowOut: number // kg/s
  turbineValvePosition: number // 0-100% open
  turbineSteamFlowOut: number // kg/s
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
