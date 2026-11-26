/**
 * Gland seal steam (ADR 0047): the operator switch seals the shaft glands, so the condenser air in-leakage takes its
 * sealed rate. Steam on a stationary rotor bows it, so the steam is admitted only while the rotor turns.
 */
import { CstGlandSteam, CstSimulation } from "../const"
import { TurbineState } from "../PowerPlantState"
import { rotorTurns } from "./TurningGear"

// Why the steam may not be admitted, or undefined when it may
export function glandSteamRefusal(turbine: TurbineState): string | undefined {
  return rotorTurns(turbine) ? undefined : "The rotor must be turning: engage the turning gear first"
}

// The steam is shut off when the rotor stops turning (the gear out and the speed at or below the standstill threshold); the flag keeps the shut-off until the steam is admitted again
export function GlandSteamTick(turbine: TurbineState): TurbineState {
  if (!turbine.glandSteamOn || rotorTurns(turbine)) return turbine
  return { ...turbine, glandSteamOn: false, glandSteamShutOff: true }
}

// kg of boiler steam the glands take in one tick: a small fixed flow, returned to the hotwell by the gland condenser
export const glandSteamMass = (turbine: TurbineState): number => (turbine.glandSteamOn ? CstGlandSteam.Flow * CstSimulation.DeltaTime : 0)
