import { Scenario } from "../scenario"
import { bypassLoop } from "./bypass-loop"
import { cooldown } from "./cooldown"
import { startupCold } from "./startup-cold"
import { turbineStart } from "./turbine-start"
import { turbineSync } from "./turbine-sync"

// Every scenario here is selectable with `pnpm sim <name>` and checked against every invariant.
export const scenarios: Record<string, Scenario> = Object.fromEntries(
  [startupCold, turbineStart, turbineSync, cooldown, bypassLoop].map((s) => [s.name, s]),
)
