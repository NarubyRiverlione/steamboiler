import { Scenario } from "./scenario"
import { bypassLoop } from "./scenarios/bypass-loop"
import { turbineRunup } from "./scenarios/turbine-runup"

// Every committed snapshot and the scenario whose final state it is. `pnpm sim:snapshots`
// rewrites them all; a test fails when a committed file no longer matches its source.
// A source starts from cold: a scenario that starts from a snapshot is never a source.
export const snapshotSources: Record<string, Scenario> = {
  "turbine-runup": turbineRunup,
  "bypass-loop": bypassLoop,
}
