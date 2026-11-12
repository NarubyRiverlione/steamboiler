/**
 * The gas knob as scenarios and operators turn it (#15). Gas is a rate command, so an operator never sets a gas value:
 * it turns the knob and the gas follows at the knob's rate. `steerGas` is the operator's hand on the knob.
 */
import PowerPlantAction from "../../src/context/PowerPlantActions"
import { BoilerState } from "../../src/context/PowerPlantState"
import { CstSimulation } from "../../src/context/const"

const { CstBoiler } = CstSimulation
const { GasRateMax, GasRateDeadZone, MaxGasFlow } = CstBoiler

const Epsilon = 1e-9

// The knob command (-1 to 1) that moves the gas at this rate (L/s per second): the inverse of the taper
export function gasCommandFor(rate: number): number {
  if (Math.abs(rate) < Epsilon) return 0
  const live: number = Math.min(1, Math.sqrt(Math.abs(rate) / GasRateMax))
  return Math.sign(rate) * (GasRateDeadZone + (1 - GasRateDeadZone) * live)
}

export const setGasCommand = (gasRateCommand: number): PowerPlantAction => ({
  type: "SET_GAS_RATE",
  payload: { gasRateCommand },
})

// Turn the knob so the gas reaches the target in the given seconds, no faster than full deflection allows;
// nothing when the knob is already there
export function steerGas(
  { gasFlow, gasRateCommand }: BoilerState,
  target: number,
  seconds: number,
): PowerPlantAction[] {
  const wanted: number = Math.max(0, Math.min(MaxGasFlow, target))
  // An end of the travel is reached by full deflection and the clamp, so it is hit exactly, not approached
  const atEnd: boolean = (wanted === 0 || wanted === MaxGasFlow) && wanted !== gasFlow
  const rate: number = atEnd
    ? Math.sign(wanted - gasFlow) * GasRateMax
    : Math.max(-GasRateMax, Math.min(GasRateMax, (wanted - gasFlow) / seconds))
  const command: number = gasCommandFor(rate)
  return Math.abs(command - gasRateCommand) < Epsilon ? [] : [setGasCommand(command)]
}
