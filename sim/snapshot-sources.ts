import { Scenario } from "./scenario"
import { heatUpToPressure } from "./scenarios/heat-up"

// Every committed snapshot and the scenario whose final state it is. `pnpm sim:snapshots`
// rewrites them all; a test fails when a committed file no longer matches its source.
export const snapshotSources: Record<string, Scenario> = {
  "at-pressure": heatUpToPressure,
}
