# The turbine valve trips at the overspeed limit

The turbine trips when its speed is at or above the **overspeed limit** (`CstTurbine.MaxRPM`, 3300 rpm, 110% of sync speed, [design-basis.md](../plant/design-basis.md)) while the turbine valve is open. It is the same trip as the vacuum trip ([ADR 0003](0003-turbine-trip-on-vacuum-limit.md)): valve to 0, speed mode to Free (which ends Synchronised, #135), PID integral cleared, `turbineTripped` set. The check is in the tick, on the speed of that tick, whatever the operator does. The reducer refuses to open the turbine valve at or above the limit (closing is always allowed), so reopening in Free cannot re-trip on the next tick; the flag clears only with the trip reset, which is refused while the speed is at the limit ([ADR 0043](0043-trip-reset.md)). Decided in #72.

## Considered options

- **Nothing, `MaxRPM` stays a figure:** rejected. Full flow in Free settles near twice sync speed, where the drive torque is zero ([ADR 0021](0021-turbine-runup-from-steam-power.md)), and a load lost in Free is unprotected ([ADR 0027](0027-generator-load-is-a-resisting-torque.md)). The owner promoted the protection to P3.
- **A separate overspeed alarm before the trip, or a second mechanical trip stage:** rejected for now. The speed meter already turns orange above 3100 rpm (sync + 100) and red above the 3300 rpm trip, and one trip is what the model needs.
- **A trip speed other than `MaxRPM`:** rejected. One number, already in the design basis. The operator cannot select it: the highest selectable speed is the 3000 rpm run-up point.
- **Close the main steam valve or open the bypass on the trip:** rejected. Not done for the vacuum trip either.

## Consequences

- No new flag and no new tile: `turbineTripped` and the "Turbine trip" tile cover it.
- The peak is the tick of the trip, plus at most one tick while the steam flow stored in the last state still drives the rotor; the `turbine-overspeed` edge scenario pins it.
- The bypass valve and the generator breaker are not touched. The breaker opens by itself when the speed leaves ±2 rpm of sync. A trip also ends the synchronised speed mode (back to Free, [ADR 0027](0027-generator-load-is-a-resisting-torque.md), #135).
- No golden-path or other edge scenario reaches `MaxRPM`; `max-output` keeps its load-rejection peak under it.
