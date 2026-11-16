/**
 * Turning gear (ADR 0051): a manually engaged gear that turns the stopped rotor at a few rpm. The turbine valve cannot be
 * opened on a stopped rotor, but can on the gear: the steam rolls the rotor off it, and the gear throws itself out above
 * the standstill speed. It needs lube oil to engage and drops out when the oil falls below the permissive.
 */
import { CstTurningGear } from "../const"
import { isAtOilPermissive } from "../Oil/OilTick"
import { OilState, TurbineState } from "../PowerPlantState"

// The rotor turns: the gear holds it, or it runs above the standstill threshold. The valve may open and the gland steam may stay only then (ADR 0051, ADR 0047)
export const rotorTurns = ({ turningGearEngaged, rpm }: TurbineState): boolean => turningGearEngaged || rpm > CstTurningGear.StandstillRpm

// Why the gear cannot be engaged, or undefined when it can
export function turningGearRefusal(turbine: TurbineState, oil: OilState): string | undefined {
  if (!isAtOilPermissive(oil)) return "Lube oil pressure is below the permissive"
  if (turbine.rpm > CstTurningGear.StandstillRpm) return "The turbine must be at standstill"
  return undefined
}

// The engaged gear holds the rotor at gear speed (a floor: it never drives it faster), throws itself out when the steam has
// the rotor above the standstill speed, and drops out below the oil permissive
export function TurningGearTick(turbine: TurbineState, oil: OilState): TurbineState {
  if (!turbine.turningGearEngaged) return turbine
  if (turbine.rpm > CstTurningGear.StandstillRpm) return { ...turbine, turningGearEngaged: false }
  if (!isAtOilPermissive(oil)) return { ...turbine, turningGearEngaged: false, rpm: turbine.rpm <= CstTurningGear.Rpm ? 0 : turbine.rpm }
  return { ...turbine, rpm: Math.max(turbine.rpm, CstTurningGear.Rpm) }
}
