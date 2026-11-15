# The deaerator high-high level trips the condensation pump

From the **deaerator high-high level** (`CstDeaerator.HighHighLevel`, 85% of the 150 m³ vessel, 22 m³ of headroom) the condensation pump trips. The level stays an own estimate with no source ([design-basis.md](../plant/design-basis.md)); it was the display-only red zone of #54 and gets its behaviour in #129. Same latch pattern as [ADR 0011](0011-hotwell-protections-in-the-tick.md) and [ADR 0041](0041-boiler-high-high-level-trips-feed-pump-and-turbine.md).

The trip is enforced in `PowerPlantTick`, whatever the operator or a scenario does, on the deaerator water volume at the start of the tick, before the pump returns anything:

- **The condensation pump trips:** its valve goes shut (`CondenserTick` takes the high-high condition as a flag), nothing is returned from the hotwell in that tick and `deaeratorHighHighTripped` is set. The flag is a deaerator flag, separate from the hotwell's low-low `condensationPumpTripped` and the feed pump's `feedPumpTripped`; the extraction steam is not touched.
- **Overshoot:** the return of one tick at most, plus the steam that keeps condensing into the vessel afterwards (the `deaerator-high` scenario trips at 85% and settles at 88.5%, never near full).

**Latching, no restart level, no hysteresis.** The reducer refuses to open the condensation pump while the flag is set or while the deaerator level is at or above the high-high level; closing is always allowed. Only the trip reset (`RESET_TRIP`, `deaeratorHighHigh`, [ADR 0043](0043-trip-reset.md)) clears the flag, and it is refused until the level is below the high-high level.

**Alarm.** One row in the annunciator list, severity `error`, owned by the deaerator part: "Deaerator level high-high trip", following the flag, next to the warning "Deaerator level high" (75%). A `TripResetButton` and a lamp sit on the Deaerator page, next to the feed pump's. The LED and the playback drop to 1x follow from the alarm list ([ADR 0034](0034-playback-speed-is-ticks-per-second.md)).

## Why the room cap is not enough

The condensation pump is limited by the room left in the deaerator (100%). After a boiler high-high trip ([ADR 0041](0041-boiler-high-high-level-trips-feed-pump-and-turbine.md)) the feed pump is shut and the condensation pump keeps running, so the deaerator fills through 75% and 85% with nothing to stop it. With this trip the chain ends at the deaerator: the condensation pump shuts, the hotwell fills and meets its own 95% clamp (ADR 0011). Nothing else trips.

## Considered options

- **Trip the extraction steam:** rejected. The steam does not fill the vessel; the water does.
- **A tile-only red zone (no action):** rejected. A zone is only honest if the plant acts on it.
- **Reuse `condensationPumpTripped`:** rejected. That flag means "the hotwell is below low-low", and its reset is allowed on the hotwell level; the two causes need their own reset condition.
- **A restart level or hysteresis:** rejected, as in ADR 0011 and ADR 0041.

## Consequences

- `DeaeratorState` gains `deaeratorHighHighTripped`; the sim snapshots are regenerated.
- `CondenserTick` takes a sixth parameter, `deaeratorHighHigh` (default false).
- `TripId` gains `deaeratorHighHigh`; the mapped type forces its rule.
- A scenario that trips it must send `RESET_TRIP` and reopen the pump. The golden-path scenarios never raise it.
- The edge scenario `deaerator-high` starts from `bypass-loop`: the feed pump is shut, makeup is forced open and the condensation pump stays shut until the hotwell is 90% full (the closed loop holds too little water to take the deaerator from 50% to 85% before the hotwell's own low-low), then it is held fully open.
