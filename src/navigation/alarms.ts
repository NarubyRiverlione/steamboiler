/** The alarm flags of the plant: the annunciator has one tile per entry, and a part's LED lights from the flags it owns. */

import type PowerPlantState from "../context/PowerPlantState"
import type { PartId } from "./plantParts"

export type AlarmId = "heatingRateOverLimit" | "burnerTripped" | "condensationPumpTripped" | "turbineTripped"

export type Alarm = {
  readonly id: AlarmId
  readonly label: string
  readonly part: PartId
  readonly active: (state: PowerPlantState) => boolean
}

export const ALARMS: readonly Alarm[] = [
  { id: "heatingRateOverLimit", label: "Heating rate over limit", part: "boiler", active: (s: PowerPlantState) => s.Boiler.heatingRateOverLimit },
  { id: "burnerTripped", label: "Burner trip", part: "boiler", active: (s: PowerPlantState) => s.Boiler.burnerTripped },
  { id: "condensationPumpTripped", label: "Condensation pump trip", part: "condenser", active: (s: PowerPlantState) => s.Condenser.condensationPumpTripped },
  { id: "turbineTripped", label: "Turbine trip", part: "turbine", active: (s: PowerPlantState) => s.Turbine.turbineTripped },
]
