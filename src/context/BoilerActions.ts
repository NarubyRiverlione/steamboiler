export type BoilerAction =
  | { type: "INCREASE_GAS_FLOW"; amount: number }
  | { type: "DECREASE_GAS_FLOW"; amount: number }
  | { type: "TOGGLE_FILL_VALVE" }
  | { type: "TOGGLE_DRAIN_VALVE" }
  | { type: "SIMULATE_TICK"; deltaTime: number }
