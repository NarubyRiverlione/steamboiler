type BoilerState = {
  waterVolume: number // liters
  temperature: number // Celsius
  pressure: number // bar
  gasFlow: number // liters/second
  // steamRate: number // kg/second - Average over last 10 seconds
  fillValveOpen: boolean
  drainValveOpen: boolean
  energy: number // kJ
  energyDelta: number // kJ/s
  steamMass: number // kg - Mass of steam currently in the boiler
  mainSteamValvePosition: number // 0-100% open
  steamFlowOut: number // g/s
}

export type BoilerAction =
  | { type: "INCREASE_GAS_FLOW"; amount: number }
  | { type: "DECREASE_GAS_FLOW"; amount: number }
  | { type: "TOGGLE_FILL_VALVE" }
  | { type: "TOGGLE_DRAIN_VALVE" }
  | { type: "ADJUST_MAIN_STEAM_VALVE"; amount: number }
  | { type: "SIMULATE_TICK"; deltaTime: number }

export default BoilerState
