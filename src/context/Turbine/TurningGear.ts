/**
 * Turning gear (ADR 0051): a manually engaged gear that turns the stopped rotor at a few rpm. While it is engaged the
 * turbine valve cannot be opened; it needs lube oil to engage and drops out when the oil falls below the trip limit.
 */
import { CstTurningGear } from "../const"
import { isAtOilPermissive, isBelowOilTripLimit } from "../Oil/OilTick"
import { OilState, TurbineState } from "../PowerPlantState"

// Why the gear cannot be engaged, or undefined when it can
export function turningGearRefusal(turbine: TurbineState, oil: OilState): string | undefined {
  if (!isAtOilPermissive(oil)) return "Lube oil pressure is below the permissive"
  if (turbine.rpm > CstTurningGear.Rpm || turbine.turbineValvePosition > 0) return "The turbine must be at standstill with the valve shut"
  return undefined
}

// The engaged gear holds the rotor at gear speed (a floor: it never drives it faster) and drops out on low oil
export function TurningGearTick(turbine: TurbineState, oil: OilState): TurbineState {
  if (!turbine.turningGearEngaged) return turbine
  if (isBelowOilTripLimit(oil)) return { ...turbine, turningGearEngaged: false }
  return { ...turbine, rpm: Math.max(turbine.rpm, CstTurningGear.Rpm) }
}
