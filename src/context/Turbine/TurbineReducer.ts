import TurbineTick from "./TurbineTick"
import TurbineState, { TurbineAction } from "./TurbineTypes"

export const initialTurbineState: TurbineState = { electricOutput: 0 }
/**
 * turbineReducer - Handles state transitions for the turbine.
 *
 * @param state - The current turbine state.
 * @param action - The action to process.
 * @returns The updated turbine state.
 */
function turbineReducer(state: TurbineState, action: TurbineAction): TurbineState {
  switch (action.type) {
    case "UPDATE_ELECTRIC_OUTPUT":
      return { ...state, electricOutput: action.payload }
    case "RESET_TURBINE":
      return { electricOutput: 0 }
    case "SIMULATE_TICK": {
      const {
        payload: { turbineValvePosition },
      } = action
      return TurbineTick(state, turbineValvePosition)
    }
    default:
      return state
  }
}

export default turbineReducer
