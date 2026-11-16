/** The alarm flags of the plant: the annunciator has one tile per entry, and a part's LED lights from the flags it owns. */

import { CstDeaerator, CstOil, CstSimulation, CstSuperheater } from "../context/const"
import { deaeratorLevel } from "../context/Deaerator/DeaeratorTick"
import { isTurbineRunning } from "../context/Oil/OilTick"
import type PowerPlantState from "../context/PowerPlantState"
import { boilerLevel } from "../utils/boilerCalculations"
import { hotwellLevel } from "../utils/condenserCalculation"
import type { PartId } from "./plantParts"

export type AlarmId = "heatingRateOverLimit" | "burnerTripped" | "condensationPumpTripped" | "turbineTripped" | "boilerLevelHigh" | "boilerLevelHighTripped" | "hotwellLevelLow" | "hotwellLevelHigh" | "hotwellLevelHighHigh" | "boilerLevelLow" | "deaeratorLevelLow" | "deaeratorLevelHigh" | "feedPumpTripped" | "deaeratorHighHighTripped" | "steamTemperatureHigh" | "lubeOilPressureLow"

// error = red tile backlight, warning = yellow; every alarm must declare one
export type AlarmSeverity = "error" | "warning"

export type Alarm = {
  readonly id: AlarmId
  readonly label: string
  readonly severity: AlarmSeverity
  readonly part: PartId
  readonly active: (state: PowerPlantState) => boolean
}

const { HotwellLow, HotwellHigh, HotwellHighHigh } = CstSimulation.CstCondenser
const { HighLevel, LowLevel } = CstSimulation.CstBoiler

export const ALARMS: readonly Alarm[] = [
  { id: "heatingRateOverLimit", label: "Heating rate over limit", severity: "warning", part: "boiler", active: (s: PowerPlantState) => s.Boiler.heatingRateOverLimit },
  { id: "burnerTripped", label: "Burner trip", severity: "error", part: "boiler", active: (s: PowerPlantState) => s.Boiler.burnerTripped },
  { id: "boilerLevelLow", label: "Boiler level low", severity: "warning", part: "boiler", active: (s: PowerPlantState) => boilerLevel(s.Boiler.waterVolume) < LowLevel },
  { id: "boilerLevelHigh", label: "Boiler level high", severity: "warning", part: "boiler", active: (s: PowerPlantState) => boilerLevel(s.Boiler.waterVolume) >= HighLevel },
  { id: "boilerLevelHighTripped", label: "Boiler level high-high trip", severity: "error", part: "boiler", active: (s: PowerPlantState) => s.Boiler.boilerLevelHighTripped },
  { id: "condensationPumpTripped", label: "Condensation pump trip", severity: "error", part: "condenser", active: (s: PowerPlantState) => s.Condenser.condensationPumpTripped },
  { id: "turbineTripped", label: "Turbine trip", severity: "error", part: "turbine", active: (s: PowerPlantState) => s.Turbine.turbineTripped },
  { id: "hotwellLevelLow", label: "Hotwell level low", severity: "warning", part: "condenser", active: (s: PowerPlantState) => hotwellLevel(s.Condenser.hotwellWaterVolume) < HotwellLow },
  { id: "hotwellLevelHigh", label: "Hotwell level high", severity: "warning", part: "condenser", active: (s: PowerPlantState) => hotwellLevel(s.Condenser.hotwellWaterVolume) >= HotwellHigh },
  { id: "hotwellLevelHighHigh", label: "Hotwell level high-high", severity: "error", part: "condenser", active: (s: PowerPlantState) => hotwellLevel(s.Condenser.hotwellWaterVolume) >= HotwellHighHigh },
  { id: "deaeratorLevelLow", label: "Deaerator level low", severity: "warning", part: "deaerator", active: (s: PowerPlantState) => deaeratorLevel(s.Deaerator.waterVolume) < CstDeaerator.LowLevel },
  { id: "deaeratorLevelHigh", label: "Deaerator level high", severity: "warning", part: "deaerator", active: (s: PowerPlantState) => deaeratorLevel(s.Deaerator.waterVolume) >= CstDeaerator.HighLevel },
  { id: "deaeratorHighHighTripped", label: "Deaerator level high-high trip", severity: "error", part: "deaerator", active: (s: PowerPlantState) => s.Deaerator.deaeratorHighHighTripped },
  { id: "steamTemperatureHigh", label: "Steam temperature high", severity: "warning", part: "steam", active: (s: PowerPlantState) => s.Boiler.steamTemperature >= CstSuperheater.AlarmTemperature },
  // Derived (ADR 0050): a running turbine with the header below the permissive pressure; the cold plant with the pump off starts dark
  { id: "lubeOilPressureLow", label: "Lube oil pressure low", severity: "warning", part: "turbineAux", active: (s: PowerPlantState) => isTurbineRunning(s.Turbine) && s.Oil.headerPressure < CstOil.PermissivePressure },
  { id: "feedPumpTripped", label: "Feed pump trip", severity: "error", part: "deaerator", active: (s: PowerPlantState) => s.Deaerator.feedPumpTripped },
]
