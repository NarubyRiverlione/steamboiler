import { Scenario } from "../scenario"
import { boilerHigh } from "./boiler-high"
import { boilerLow } from "./boiler-low"
import { bypassLoop } from "./bypass-loop"
import { darkStart } from "./dark-start"
import { deaeratorHigh } from "./deaerator-high"
import { deaeratorVentClosed } from "./deaerator-vent-closed"
import { deaeratorVentOpen } from "./deaerator-vent-open"
import { glandSeal } from "./gland-seal"
import { heatUpAtLimit } from "./heat-up"
import { hotwellHigh } from "./hotwell-high"
import { hotwellLow } from "./hotwell-low"
import { lowPressureClose } from "./low-pressure-close"
import { lubeOilTrip } from "./lube-oil-trip"
import { turningGear } from "./turning-gear"
import { maxOutput } from "./max-output"
import { reliefLift } from "./relief-lift"
import { returnStop } from "./return-stop"
import { sealWaterSteady } from "./seal-water-steady"
import { sealWaterTrip } from "./seal-water-trip"
import { startUpOrder } from "./start-up-order"
import { sjaeClosedLoad } from "./sjae-closed-load"
import { sprayStuckClosed } from "./spray-stuck-closed"
import { houseLoadHold } from "./house-load-hold"
import { houseLoadShort } from "./house-load-short"
import { loadRejection } from "./load-rejection"
import { turbineLoad } from "./turbine-load"
import { turbineOverspeed } from "./turbine-overspeed"
import { turbineRunup } from "./turbine-runup"
import { turbineSync } from "./turbine-sync"
import { turbineTrip } from "./turbine-trip"
import { vacuumLoss } from "./vacuum-loss"

// Golden path: how the plant is meant to be run. Each step adds one thing (loop → speed → breaker → load).
export const goldenPath: Scenario[] = [bypassLoop, turbineRunup, turbineSync, turbineLoad]

// Edge: drive the plant past one limit and check that its protection acts.
export const edge: Scenario[] = [reliefLift, hotwellHigh, hotwellLow, boilerLow, boilerHigh, deaeratorHigh, heatUpAtLimit, lowPressureClose, maxOutput, returnStop, turbineOverspeed, turbineTrip, lubeOilTrip, turningGear, glandSeal, startUpOrder, sealWaterSteady, sealWaterTrip, vacuumLoss, sjaeClosedLoad, sprayStuckClosed, deaeratorVentClosed, deaeratorVentOpen, darkStart, houseLoadHold, loadRejection, houseLoadShort]

// Every scenario here is selectable with `pnpm sim <name>` and checked against every invariant.
export const scenarios: Record<string, Scenario> = Object.fromEntries([...goldenPath, ...edge].map((s) => [s.name, s]))
