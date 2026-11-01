import PowerPlantAction from "../../src/context/PowerPlantActions"
import PowerPlantState from "../../src/context/PowerPlantState"
import { StartGas } from "./steps"

// The pressure hold shared by the scenario operators (GLOSSARY.md, "Pressure hold"): once the boiler is at the
// working pressure, gas is the throttle. These are operator settings, not plant physics.

export const PressureHoldSettings = {
  Target: 165, // bar: working pressure, below the 180 bar design pressure
  Band: 2, // bar: no gas change within target ± band, except against the trend
  GasStep: 10, // liters/second per adjustment
  GasCeiling: StartGas, // liters/second: gas never goes above the heat-up gas
  GasFloor: 100, // liters/second: the burner's minimum firing rate, the hold never puts the flame out
}

const S = PressureHoldSettings

// Outside the band always correct; inside it, only lean against the trend so the value settles.
// Returns +1 when the actuator should go up (the value is low), -1 when down.
export function bandDirection(error: number, band: number, trend: number): -1 | 0 | 1 {
  const correcting = Math.abs(error) > band || Math.sign(trend) === Math.sign(error)
  if (error === 0 || !correcting) return 0
  return error < 0 ? 1 : -1
}

// Pressure follows the saturation of the water, so `heatingRate` is the pressure trend.
// Below the band the gas goes up to the ceiling (a no-op while the build phase runs at the ceiling), above it down to the floor.
export function holdPressureWithGas({ Boiler }: PowerPlantState): PowerPlantAction[] {
  const direction = bandDirection(Boiler.pressure - S.Target, S.Band, Boiler.heatingRate)
  const gas = Math.max(S.GasFloor, Math.min(S.GasCeiling, Boiler.gasFlow + direction * S.GasStep))
  const delta = gas - Boiler.gasFlow
  if (delta === 0) return []
  return [{ type: delta > 0 ? "INCREASE_GAS_FLOW" : "DECREASE_GAS_FLOW", amount: Math.abs(delta) }]
}
