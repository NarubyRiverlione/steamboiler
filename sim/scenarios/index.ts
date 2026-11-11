import { Scenario } from "../scenario"
import { boilerLow } from "./boiler-low"
import { bypassLoop } from "./bypass-loop"
import { deaeratorVentClosed } from "./deaerator-vent-closed"
import { deaeratorVentOpen } from "./deaerator-vent-open"
import { heatUpAtLimit } from "./heat-up"
import { hotwellHigh } from "./hotwell-high"
import { hotwellLow } from "./hotwell-low"
import { lowPressureClose } from "./low-pressure-close"
import { maxOutput } from "./max-output"
import { reliefLift } from "./relief-lift"
import { returnStop } from "./return-stop"
import { sjaeClosedLoad } from "./sjae-closed-load"
import { turbineLoad } from "./turbine-load"
import { turbineOverspeed } from "./turbine-overspeed"
import { turbineRunup } from "./turbine-runup"
import { turbineSync } from "./turbine-sync"
import { turbineTrip } from "./turbine-trip"
import { vacuumLoss } from "./vacuum-loss"

// Golden path: how the plant is meant to be run. Each step adds one thing (loop → speed → breaker → load).
export const goldenPath: Scenario[] = [bypassLoop, turbineRunup, turbineSync, turbineLoad]

// Edge: drive the plant past one limit and check that its protection acts.
export const edge: Scenario[] = [reliefLift, hotwellHigh, hotwellLow, boilerLow, heatUpAtLimit, lowPressureClose, maxOutput, returnStop, turbineOverspeed, turbineTrip, vacuumLoss, sjaeClosedLoad, deaeratorVentClosed, deaeratorVentOpen]

// Every scenario here is selectable with `pnpm sim <name>` and checked against every invariant.
export const scenarios: Record<string, Scenario> = Object.fromEntries([...goldenPath, ...edge].map((s) => [s.name, s]))
