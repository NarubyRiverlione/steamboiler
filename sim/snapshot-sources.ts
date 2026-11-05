import { Scenario } from "./scenario"
import { bypassLoop } from "./scenarios/bypass-loop"
import { turbineRunup } from "./scenarios/turbine-runup"
import { turbineSync } from "./scenarios/turbine-sync"

// Every committed snapshot and the scenario whose final state it is. `pnpm sim:snapshots`
// rewrites them all; a test fails when a committed file no longer matches its source.
// A source starts from cold or from an earlier source listed before it (`turbine-sync` from `turbine-runup`),
// so `pnpm sim:snapshots` regenerates the chain in order.
export const snapshotSources: Record<string, Scenario> = {
  "turbine-runup": turbineRunup,
  "turbine-sync": turbineSync,
  "bypass-loop": bypassLoop,
}
