# The boiler high-high level trips the feed pump and the turbine

From the **boiler high-high level** (`CstBoiler.HighHighLevel`, 70% of the 100 m³ boiler) the boiler feed pump trips and the turbine trips. Two named boiler constants, next to `BurnerLowLowLevel`, with the note that they are UNVERIFIED engineering estimates with no source, recorded in [design-basis.md](../plant/design-basis.md): `HighLevel` 65% (the alarm) and `HighHighLevel` 70% (the trip). Decided in #62; same pattern as [ADR 0003](0003-turbine-trip-on-vacuum-limit.md), [ADR 0011](0011-hotwell-protections-in-the-tick.md) and [ADR 0017](0017-burner-trips-on-low-water-level.md).

The trip is enforced in `PowerPlantTick`, whatever the operator or a scenario does, on the boiler water volume at the start of the tick (as ADR 0017 reads it), before the feed pump delivers anything in that tick:

- **The feed pump trips:** its valve goes shut, nothing is delivered to the boiler in that tick and `boilerLevelHighTripped` (a boiler flag, separate from the deaerator's low-low `feedPumpTripped`) is set. The condensation pump is untouched: the deaerator fills and the water backs up to the hotwell by the existing room rules.
- **The turbine trips:** an open turbine valve is closed, back to Free, the PID integral cleared, `turbineTripped` set: the one turbine trip object of `TurbineTick` that the vacuum limit and the overspeed use. A shut valve is left alone.
- **The burner does not trip.**

**Latching, no restart level.** The pump stays shut after the trip. The reducer refuses to open the feed pump while the boiler level is at or above the trip (and, as before, while the deaerator is below its low-low); closing is always allowed. The opening is also refused while the flag is set; the flag clears only with the trip reset, allowed once the level is below the trip ([ADR 0043](0043-trip-reset.md)). Feedwater control must not re-open the valve while the flag is set. The turbine trip clears with its own trip reset, which is also refused while the boiler is at the high-high level.

**Alarm.** Two rows in the annunciator list, both owned by the boiler: "Boiler level high" (warning), derived and stateless, active from 65% so it is on ahead of the trip, and "Boiler level high-high trip" (error), which follows the flag. The playback drop to 1x comes from the alarm list ([ADR 0034](0034-playback-speed-is-ticks-per-second.md)).

## Considered options

- **Trip the condensation pump instead:** rejected. It is the hotwell's pump, and the boiler's only water supply is the feed pump ([ADR 0004](0004-return-stops-at-full-boiler.md)); the water the feed pump no longer takes backs up by the existing room rules.
- **Trip the turbine only:** rejected. The turbine trip stops water carry-over into the turbine but not the overfeed itself, so the level would keep climbing.
- **Trip the feed pump only:** rejected. Water carry-over is the reason a real plant trips on a high drum level; the carry-over itself is not modelled, but the protection that follows from it is.
- **A burner trip, a feed-water throttle or a level controller on high level:** out of scope. The operator band (50% ± 5%) and the 20% low-low trip ([ADR 0017](0017-burner-trips-on-low-water-level.md)) are unchanged.
- **Predict the tick's inflow and trip early:** rejected. The trip is on the level at the start of the tick; the overshoot is at most one tick's delivery (the `boiler-high` scenario peaks at 70.0%), far from the full boiler.
- **Close the main steam valve:** out of scope; only the existing turbine trip.

## Consequences

- `BoilerState` gains `boilerLevelHighTripped`; the sim snapshots are regenerated.
- The room rule of ADR 0004 is now a second line: the pump is shut at 70%, so a Return into a nearly full boiler is only reached by a state loaded or set from outside the tick.
- The old 30–70% level band is dropped (the operator band and the low-low trip cover it).
- The loop operator's feedwater control holds the pump shut while the flag is set, so a scenario that trips it needs the operator to open the pump again.
- The cold fill (35%, [ADR 0018](0018-cold-fill-at-35-percent.md)) and its expansion to 50% at 165 bar stay clear of both levels.
- Water carry-over, wet steam and turbine damage are not modelled: the trip protects the plant, it does not remove the effect.
- The two levels are estimates with no source. Replace them when a source is found.
