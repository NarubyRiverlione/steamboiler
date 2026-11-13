# Only a trip reset clears a latched trip

Five trips latch: `burnerTripped` (boiler low-low level, [ADR 0017](0017-burner-trips-on-low-water-level.md)), `boilerLevelHighTripped` (boiler high-high level, [ADR 0041](0041-boiler-high-high-level-trips-feed-pump-and-turbine.md)), `feedPumpTripped` (deaerator low-low, [ADR 0011](0011-hotwell-protections-in-the-tick.md)), `condensationPumpTripped` (hotwell low-low, ADR 0011) and `turbineTripped` (vacuum limit [ADR 0003](0003-turbine-trip-on-vacuum-limit.md), overspeed [ADR 0040](0040-turbine-trip-on-overspeed.md), boiler high-high, and the closure of the main steam valve on low pressure [ADR 0026](0026-valve-flow-follows-pressure.md)). Each used to clear as a side effect of a control action. Now **only a trip reset clears a trip**: the reducer action `RESET_TRIP` with a typed trip id (`burner`, `boilerHighHigh`, `feedPump`, `condensationPump`, `turbine`). Decided in #126.

- **Reset condition:** the cause must have gone, at the trip's own threshold, with no hysteresis. Burner: boiler level at or above `BurnerLowLowLevel`. Boiler high-high: level below `HighHighLevel`. Feed pump: deaerator level at or above low-low. Condensation pump: hotwell level at or above low-low. Turbine: condenser pressure at or below the vacuum limit AND rpm below `MaxRPM` AND boiler below high-high, all read live; the low-pressure closure has no persistent condition and never blocks. One pure refusal function per trip (`tripResetRefusal` in `src/context/tripReset.ts`) returns the reason or `undefined`; the mapped type makes a missing rule a compile error. A refused reset, or a reset of an untripped component, leaves the state as it is.
- **A reset only clears the flag:** gas, valves and the gas knob stay where the trip left them (0). Opening or raising is a separate operator step.
- **Opening is refused while the flag is set:** gas raise past the dead zone, feed pump opening (also while the boiler high-high flag is set), condensation pump opening and turbine valve opening, the Hold PID included. The refusals are silent, as before. Closing and lowering stay always allowed. The existing level and pressure refusals stay, so the controls are refused on the flag and on the live cause.
- **Buttons:** one `RESET` `LensButton` ([ADR 0039](0039-latching-controls-are-turn-switches.md): a momentary action) beside each trip tile or lamp, on the page that owns the trip: Boiler (burner, boiler high-high), Deaerator (feed pump), Condenser (condensation pump), Turbine (turbine). Enabled only while its trip is set and its cause has gone; the `title` says why not. The reducer refusal is the backstop.
- **Annunciator:** unchanged ([ADR 0015](0015-ui-redo-analog-board-preferred.md)). Tiles follow the flags (flash, ACK, annunciator reset as today); a tile now stays lit until the trip reset. The header RESET is the **annunciator reset** in the docs: it darkens steady tiles and clears no trip.
- **Headless:** the loop operator never resets a trip. A scenario that needs the plant back sends an explicit `RESET_TRIP` before the reopen.

## Considered options

- **A master reset:** rejected. The owner wants the reset next to the trip it clears, so the operator sees which trip and why.
- **Keep clearing on the next opening as well:** rejected. A trip could clear before the operator understood it, and there were three clearing rules to learn.
- **Hysteresis or a restart level:** rejected. Opening is refused until the operator acts, so one threshold cannot chatter.
- **A reset that restarts the pump or the burner:** rejected. A restart is an operator decision.

## Consequences

- No new state field; snapshots only change where a scenario's behaviour does (none did).
- A tripped flag that stays set after its level recovers is now normal: the tile stays lit until the operator resets.
