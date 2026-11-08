/**
 * Simulation envelope around the plant: the simulated clock and the playback speed live here, outside
 * PowerPlantState, so snapshots do not change. One reducer step also applies the alarm rule, so the speed drops
 * on the very tick the alarm comes on. Acknowledging is the annunciator's (UI layer); the speed selector reads it.
 */
import { newAlarms } from "./Alarms"
import PowerPlantAction from "./PowerPlantActions"
import { PlaybackSpeed } from "./Playback"
import { initialPowerPlantState, powerPlantReducer } from "./PowerPlantReducer"
import { runTicks } from "./PowerPlantBatch"
import PowerPlantState from "./PowerPlantState"

export type SimulationState = {
  plant: PowerPlantState
  ticks: number // fixed ticks run since the start
  speed: PlaybackSpeed
}

export type SimulationAction = PowerPlantAction | { type: "SET_PLAYBACK_SPEED"; speed: PlaybackSpeed }

export const makeInitialSimulation = (plant: PowerPlantState = initialPowerPlantState): SimulationState => ({
  plant,
  ticks: 0,
  speed: 1,
})

// An alarm that comes on drops the speed to 1x (a pause stays a pause)
function withAlarmRule(before: SimulationState, plant: PowerPlantState, ticks: number): SimulationState {
  const raised: boolean = newAlarms(before.plant, plant).length > 0
  return { ...before, plant, ticks, speed: raised && before.speed > 1 ? 1 : before.speed }
}

export function simulationReducer(state: SimulationState, action: SimulationAction): SimulationState {
  switch (action.type) {
    case "SIMULATE_TICK":
    case "SIMULATE_TICKS": {
      const { state: plant, ticksRun } = runTicks(state.plant, action.type === "SIMULATE_TICK" ? 1 : action.count)
      return withAlarmRule(state, plant, state.ticks + ticksRun)
    }
    case "SET_PLAYBACK_SPEED":
      return { ...state, speed: action.speed }
    case "LOAD_STATE":
      // A loaded preset is a fresh plant: clock to zero, speed to 1x, and its own alarms are not "new"
      return makeInitialSimulation(powerPlantReducer(state.plant, action))
    default:
      return withAlarmRule(state, powerPlantReducer(state.plant, action), state.ticks)
  }
}
