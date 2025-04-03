/**
 * TurbineTypes.ts
 *
 * Defines the types for the turbine module.
 * Phase 1: Minimal placeholder definitions.
 */

type TurbineState = {
  electricOutput: number // MW
}

/**
 * Defines actions for the turbine reducer.
 */
export type TurbineAction =
  | { type: "UPDATE_ELECTRIC_OUTPUT"; payload: number }
  | { type: "RESET_TURBINE" }
  | { type: "SIMULATE_TICK"; payload: { turbineValvePosition: number } }

export default TurbineState
