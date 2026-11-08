/**
 * The alarm list: every plant flag the operator must see and acknowledge. The single source for the
 * playback-speed rules (ADR 0026); a tile added later (#59, #62, #72) is one more row here.
 */
import PowerPlantState from "./PowerPlantState"

export type AlarmId =
  | "heatingRate"
  | "reliefValve"
  | "burnerTrip"
  | "turbineTrip"
  | "condensationPumpTrip"

type Alarm = { id: AlarmId; label: string; isActive: (state: PowerPlantState) => boolean }

export const Alarms: readonly Alarm[] = [
  { id: "heatingRate", label: "Heating rate", isActive: (s) => s.Boiler.heatingRateOverLimit },
  { id: "reliefValve", label: "Relief valve lifted", isActive: (s) => s.Boiler.reliefValveOpen },
  { id: "burnerTrip", label: "Burner trip", isActive: (s) => s.Boiler.burnerTripped },
  { id: "turbineTrip", label: "Turbine trip", isActive: (s) => s.Turbine.turbineTripped },
  { id: "condensationPumpTrip", label: "Condensation pump trip", isActive: (s) => s.Condenser.condensationPumpTripped },
]

export const activeAlarms = (state: PowerPlantState): AlarmId[] =>
  Alarms.filter((alarm) => alarm.isActive(state)).map((alarm) => alarm.id)

// Alarms set in `after` that were not set in `before`
export const newAlarms = (before: PowerPlantState, after: PowerPlantState): AlarmId[] => {
  const previous: AlarmId[] = activeAlarms(before)
  return activeAlarms(after).filter((id) => !previous.includes(id))
}

// Speed is held at 1x while a set alarm is not yet acknowledged; after ACK it can be raised even if the flag stays set
export const isSpeedLocked = (state: PowerPlantState, unacknowledged: readonly AlarmId[]): boolean =>
  activeAlarms(state).some((id) => unacknowledged.includes(id))
