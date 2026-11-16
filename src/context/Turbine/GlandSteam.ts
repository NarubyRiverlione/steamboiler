/**
 * Gland seal steam (ADR 0047): the operator switch seals the shaft glands, so the condenser air in-leakage takes its
 * sealed rate. Steam on a stationary rotor bows it, so the steam is admitted only while the rotor turns.
 */
import { CstGlandSteam, CstSimulation, CstTurningGear } from "../const"
import { TurbineState } from "../PowerPlantState"

// The rotor turns: the gear holds it, or it runs above the standstill threshold
const rotorTurns = ({ turningGearEngaged, rpm }: TurbineState): boolean => turningGearEngaged || rpm > CstTurningGear.StandstillRpm

// Why the steam may not be admitted, or undefined when it may
export function glandSteamRefusal(turbine: TurbineState): string | undefined {
  return rotorTurns(turbine) ? undefined : "The rotor must be turning: engage the turning gear first"
}

// The steam is shut off when the rotor is not turning and nothing can turn it: the gear out, the main steam valve shut.
// With the main steam valve open the rotor is about to roll, so the disengage that starts the roll keeps the steam.
export function GlandSteamTick(turbine: TurbineState): TurbineState {
  if (!turbine.glandSteamOn || rotorTurns(turbine) || turbine.mainSteamValve) return turbine
  return { ...turbine, glandSteamOn: false }
}

// kg of boiler steam the glands take in one tick: a small fixed flow, returned to the hotwell by the gland condenser
export const glandSteamMass = (turbine: TurbineState): number => (turbine.glandSteamOn ? CstGlandSteam.Flow * CstSimulation.DeltaTime : 0)
