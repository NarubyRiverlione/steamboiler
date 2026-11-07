import { Scenario } from "../scenario"
import { boilerLow } from "./boiler-low"
import { bypassLoop } from "./bypass-loop"
import { heatUpAtLimit } from "./heat-up"
import { hotwellHigh } from "./hotwell-high"
import { hotwellLow } from "./hotwell-low"
import { lowPressureClose } from "./low-pressure-close"
import { maxOutput } from "./max-output"
import { reliefLift } from "./relief-lift"
import { returnStop } from "./return-stop"
import { turbineLoad } from "./turbine-load"
import { turbineRunup } from "./turbine-runup"
import { turbineSync } from "./turbine-sync"

// Golden path: how the plant is meant to be run. Each step adds one thing (loop → speed → breaker → load).
export const goldenPath: Scenario[] = [bypassLoop, turbineRunup, turbineSync, turbineLoad]

// Edge: drive the plant past one limit and check that its protection acts.
export const edge: Scenario[] = [reliefLift, hotwellHigh, hotwellLow, boilerLow, heatUpAtLimit, lowPressureClose, maxOutput, returnStop]

// Every scenario here is selectable with `pnpm sim <name>` and checked against every invariant.
export const scenarios: Record<string, Scenario> = Object.fromEntries([...goldenPath, ...edge].map((s) => [s.name, s]))
