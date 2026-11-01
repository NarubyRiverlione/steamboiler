import { Scenario } from "../scenario"
import { bypassLoop } from "./bypass-loop"
import { cooldown } from "./cooldown"
import { fullGas } from "./full-gas"
import { heatToMsv } from "./heat-to-msv"
import { heatUpAtLimit } from "./heat-up"
import { reliefLift } from "./relief-lift"
import { startupCold } from "./startup-cold"
import { turbineStart } from "./turbine-start"
import { turbineSync } from "./turbine-sync"

// Every scenario here is selectable with `pnpm sim <name>` and checked against every invariant.
export const scenarios: Record<string, Scenario> = Object.fromEntries(
  [startupCold, heatToMsv, heatUpAtLimit, turbineStart, turbineSync, cooldown, bypassLoop, reliefLift, fullGas].map((s) => [s.name, s]),
)
