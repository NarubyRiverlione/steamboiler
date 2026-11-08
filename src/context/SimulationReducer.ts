/**
 * Simulation envelope around the plant: the simulated clock, the playback speed and the alarm acknowledgements
 * live here, outside PowerPlantState, so snapshots do not change. One reducer step also applies the alarm rule,
 * so the speed drops on the very tick the alarm comes on.
 */
import { AlarmId, activeAlarms, isSpeedLocked, newAlarms } from "./Alarms"
import PowerPlantAction from "./PowerPlantActions"
import { PlaybackSpeed } from "./Playback"
import { initialPowerPlantState, powerPlantReducer } from "./PowerPlantReducer"
import { runTicks } from "./PowerPlantBatch"
import PowerPlantState from "./PowerPlantState"

export type SimulationState = {
  plant: PowerPlantState
  ticks: number // fixed ticks run since the start
  speed: PlaybackSpeed
  unacknowledged: AlarmId[]
}

export type SimulationAction =
  | PowerPlantAction
  | { type: "SET_PLAYBACK_SPEED"; speed: PlaybackSpeed }
  | { type: "ACKNOWLEDGE_ALARMS" }

export const makeInitialSimulation = (plant: PowerPlantState = initialPowerPlantState): SimulationState => ({
  plant,
  ticks: 0,
  speed: 1,
  unacknowledged: [],
})

// An alarm that comes on drops the speed to 1x (a pause stays a pause) and waits for ACK
function withAlarmRule(before: SimulationState, plant: PowerPlantState, ticks: number): SimulationState {
  const raised: AlarmId[] = newAlarms(before.plant, plant)
  const stillActive: AlarmId[] = activeAlarms(plant)
  return {
    ...before,
    plant,
    ticks,
    speed: raised.length > 0 && before.speed > 1 ? 1 : before.speed,
    unacknowledged: [...before.unacknowledged.filter((id) => stillActive.includes(id)), ...raised],
  }
}

export function simulationReducer(state: SimulationState, action: SimulationAction): SimulationState {
  switch (action.type) {
    case "SIMULATE_TICK":
    case "SIMULATE_TICKS": {
      const { state: plant, ticksRun } = runTicks(state.plant, action.type === "SIMULATE_TICK" ? 1 : action.count)
      return withAlarmRule(state, plant, state.ticks + ticksRun)
    }
    case "SET_PLAYBACK_SPEED":
      // Only a raise is refused while locked; slowing down or pausing is always allowed
      return action.speed > 1 && isSpeedLocked(state.plant, state.unacknowledged)
        ? state
        : { ...state, speed: action.speed }
    case "ACKNOWLEDGE_ALARMS":
      return { ...state, unacknowledged: [] }
    default:
      return withAlarmRule(state, powerPlantReducer(state.plant, action), state.ticks)
  }
}
