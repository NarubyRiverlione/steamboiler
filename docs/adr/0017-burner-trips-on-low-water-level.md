# The burner trips on low water level

The burner trips when the boiler water volume falls below the **burner low-low level**: one named boiler constant (`BurnerLowLowLevel`, 20% of the 100 m³ boiler), with its value and the note that it is an UNVERIFIED engineering estimate recorded in [design-basis.md](../plant/design-basis.md). The trip runs in `BoilerTick`, whatever the operator or a scenario does: gas goes to 0 and `burnerTripped` is set. The reducer refuses to raise the gas while the level is below low-low; the flag clears on the next successful raise. Decided in #33; same pattern as [ADR 0003](0003-turbine-trip-on-vacuum-limit.md) and [ADR 0011](0011-hotwell-protections-in-the-tick.md).

## Considered options

- **A pressure or temperature trip:** rejected. Pressure follows saturation, so the two are one quantity ([ADR 0001](0001-boiler-pressure-follows-saturation.md)), and the relief valve already holds it at 178 bar while water remains ([ADR 0005](0005-relief-valve-vents-to-atmosphere.md)). The overshoot in `boiler-low` only happens in the last litre after the boiler has boiled dry, so a low-level trip that fires earlier removes the cause. A pressure trip would sit above the relief valve and never fire while water remains.
- **Limit the gas instead of tripping it:** rejected. A burner that keeps firing into a nearly empty boiler is the failure this ticket exists to stop. The minimum firing rate of [ADR 0008](0008-pressure-hold-with-gas.md) is the operator's floor, and a protection overrides it.
- **Enforce it in the operator or the reducer only:** rejected for the same reason as in ADR 0011: a protection the operator can leave out is not a protection. The reducer refusal is an addition, not the protection.
- **A level in mm from normal water level:** rejected. The boiler is one lump with a volume, so the level is a volume fraction, as for the hotwell. It drifts with temperature ([ADR 0007](0007-water-state-is-mass-in-kg.md)); that is real plant behaviour.

## Consequences

- After a trip the gas stays at 0 until the operator raises it, and that is refused while the level is below low-low. There is no separate restart level, for the reason given in ADR 0003.
- `BoilerState` gains `burnerTripped`; the boiler panel shows it and the sim report marks it, like relief lifts.
- `boiler-low` no longer runs dry, and its expected failures `pressure within design pressure` and `temperature within design temperature` become passing tests.
- A drained boiler (the drain valve) trips the burner as well.
- The 20% level is an estimate with no source. Replace it when a source is found.
