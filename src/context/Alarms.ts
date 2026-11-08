/** Alarm rule for the playback speed: which alarms of the annunciator's list (navigation/alarms.ts, the single source) come on. */

import { ALARMS, type Alarm, type AlarmId } from "../navigation/alarms"
import PowerPlantState from "./PowerPlantState"

export const activeAlarms = (state: PowerPlantState): AlarmId[] =>
  ALARMS.filter((alarm: Alarm) => alarm.active(state)).map((alarm: Alarm) => alarm.id)

// Alarms set in `after` that were not set in `before`
export const newAlarms = (before: PowerPlantState, after: PowerPlantState): AlarmId[] => {
  const previous: AlarmId[] = activeAlarms(before)
  return activeAlarms(after).filter((id: AlarmId) => !previous.includes(id))
}
