/** The text of each live value on the plant overview (#99), from the plant state; the levels and the pressure arrive smoothed, as the part pages show them. */

import { CstDeaerator, CstSimulation } from "../context/const"
import type PowerPlantState from "../context/PowerPlantState"
import { getBoilingPoint } from "../utils/steamTable"
import type { ValueId } from "./plantDiagram"

const { CstBoiler, CstCondenser } = CstSimulation

export type SmoothedValues = {
  // bar, as the Boiler page smooths it
  readonly pressure: number
  // 0-1 of the hotwell volume, as the Condenser page smooths it
  readonly hotwellLevel: number
}

const percent = (fraction: number): string => `${(fraction * 100).toFixed(0)} %`
const celsius = (value: number): string => `${value.toFixed(0)} °C`

// The steam temperature rests at saturation with no steam flowing (ADR 0044); only above it is there superheated steam to show
const SUPERHEAT_MARGIN = 1
const steamTemperatureText = (state: PowerPlantState): string =>
  state.Boiler.steamTemperature > getBoilingPoint(state.Boiler.pressure) + SUPERHEAT_MARGIN ? celsius(state.Boiler.steamTemperature) : "—"

export function overviewValueTexts(state: PowerPlantState, smoothed: SmoothedValues): Record<ValueId, string> {
  const { Boiler, Turbine, Condenser, Heater, Deaerator } = state
  return {
    boilerPressure: `${smoothed.pressure.toFixed(1)} bar`,
    boilerLevel: percent(Boiler.waterVolume / CstBoiler.TotalVolume),
    gasFlow: `${Boiler.gasFlow.toFixed(0)} L/s`,
    mainSteamValve: Turbine.mainSteamValve ? "OPEN" : "CLOSED",
    turbineValve: percent(Turbine.turbineValvePosition),
    bypassValve: percent(Turbine.bypassValvePosition),
    turbineSpeed: `${Turbine.rpm.toFixed(0)} rpm`,
    output: `${Turbine.electricOutput.toFixed(1)} MW`,
    loadSetpoint: `${Turbine.loadSetpoint.toFixed(1)} MW`,
    condenserPressure: `${Condenser.pressure.toFixed(0)} mbar`,
    hotwellLevel: percent(smoothed.hotwellLevel),
    condensationPump: percent(Condenser.condensationPumpValvePosition),
    deaeratorTemperature: celsius(Deaerator.temperature),
    deaeratorLevel: percent(Deaerator.waterVolume / CstDeaerator.TotalVolume),
    feedPump: percent(Deaerator.feedPumpValvePosition),
    heaterTemperature: celsius(Heater.returnTemperature),
    economizerTemperature: celsius(Boiler.returnTemperatureOut),
    stackTemperature: celsius(Boiler.stackTemperature),
    steamTemperature: steamTemperatureText(state),
  }
}

export const hotwellFraction = (state: PowerPlantState): number =>
  state.Condenser.hotwellWaterVolume / CstCondenser.TotalVolume
