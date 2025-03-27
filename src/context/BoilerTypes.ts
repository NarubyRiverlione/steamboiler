type BoilerState = {
  waterVolume: number // liters
  temperature: number // Celsius
  pressure: number // bar
  gasFlow: number // liters/second
  steamRate: number // kg/second
  fillValveOpen: boolean
  drainValveOpen: boolean
  energy: number // kJ
  energyDelta: number // kJ/s
}

export type BoilerAction =
  | { type: "INCREASE_GAS_FLOW"; amount: number }
  | { type: "DECREASE_GAS_FLOW"; amount: number }
  | { type: "TOGGLE_FILL_VALVE" }
  | { type: "TOGGLE_DRAIN_VALVE" }
  | { type: "SIMULATE_TICK"; deltaTime: number }

export default BoilerState
