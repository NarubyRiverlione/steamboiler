/** The parts of the plant that have a page: route, name and the alarm flags that light the part's LED. */

import type PowerPlantState from "../context/PowerPlantState"

export type PartId = "boiler" | "condenser" | "turbine"

export const PART_IDS: readonly PartId[] = ["boiler", "condenser", "turbine"]

export const PARTS: Readonly<Record<PartId, { readonly path: string; readonly name: string }>> = {
  boiler: { path: "/boiler", name: "Boiler" },
  condenser: { path: "/condenser", name: "Condenser" },
  turbine: { path: "/turbine", name: "Turbine" },
}

export const OVERVIEW_PATH = "/"

export function partAlarms(state: PowerPlantState): Record<PartId, boolean> {
  return {
    boiler: state.Boiler.heatingRateOverLimit || state.Boiler.burnerTripped,
    condenser: state.Condenser.condensationPumpTripped,
    turbine: state.Turbine.turbineTripped,
  }
}

// The part a step away from the current path; the overview steps into the first (next) or last (previous) part, and the ends wrap
export function neighbourPath(currentPath: string, step: 1 | -1): string {
  const index: number = PART_IDS.findIndex((id: PartId) => PARTS[id].path === currentPath)
  if (index === -1) return PARTS[step === 1 ? PART_IDS[0] : PART_IDS[PART_IDS.length - 1]].path
  return PARTS[PART_IDS[(index + step + PART_IDS.length) % PART_IDS.length]].path
}
