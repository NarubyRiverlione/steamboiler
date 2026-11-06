/**
 * The pressure hold shared by the scenario operators (GLOSSARY.md, "Pressure hold", ADR 0008): once the boiler is at
 * the working pressure, gas is the throttle. These are operator settings, not plant physics.
 */
import PowerPlantAction from "../../src/context/PowerPlantActions"
import PowerPlantState from "../../src/context/PowerPlantState"
import { bandDirection } from "./band"
import { CstSimulation } from "../../src/context/const"
import { StartGas } from "./steps"

export const PressureHoldSettings = {
  Target: 165, // bar: working pressure, below the 180 bar design pressure
  Band: 2, // bar: no gas change within target ± band, except against the trend
  GasStep: 20, // liters/second per adjustment
  GasCeiling: StartGas, // liters/second: gas never goes above the heat-up gas
  LoadGasCeiling: CstSimulation.CstBoiler.MaxGasFlow, // liters/second: the ceiling once the generator carries load, the plant's full gas (#71)
  GasFloor: 100, // liters/second: the burner's minimum firing rate, the hold never puts the flame out
}

const S = PressureHoldSettings

// True from the moment pressure first reaches the bottom of the band: the build phase is over
export const atWorkingPressure = (pressure: number): boolean => pressure >= S.Target - S.Band

// Pressure follows the saturation of the water, so `heatingRate` is the pressure trend
// Below the band gas goes up to the ceiling (the heat-up gas, or the one given) (a no-op while the build phase runs at the ceiling), above it down to the floor
export function holdPressureWithGas({ Boiler }: PowerPlantState, gasCeiling: number = S.GasCeiling): PowerPlantAction[] {
  const direction = bandDirection(Boiler.pressure - S.Target, S.Band, Boiler.heatingRate)
  const gas = Math.max(S.GasFloor, Math.min(gasCeiling, Boiler.gasFlow + direction * S.GasStep))
  const delta = gas - Boiler.gasFlow
  if (delta === 0) return []
  return [{ type: delta > 0 ? "INCREASE_GAS_FLOW" : "DECREASE_GAS_FLOW", amount: Math.abs(delta) }]
}
