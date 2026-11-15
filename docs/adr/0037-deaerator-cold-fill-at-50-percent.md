# The deaerator is filled cold to 50%, so it ends at about 55% hot

**Status: accepted.** Decided in #40 at a 38% cold fill (50.1% hot in `bypass-loop`, #119); changed to a **50% cold fill** on 2026-11-15 by the owner, for the app and the scenarios alike (`CstDeaerator.StartLevel`). The headless runner now peaks at 55.1% hot in `bypass-loop` and `turbine-runup` and settles at the 50% working level; with nothing feeding the drum (`heat-up`) it reaches about 65%. In the style of [ADR 0018](0018-cold-fill-of-the-boiler.md).

Heating from 20 °C to 3 bar (134 °C) raises the level for two reasons:

- **Thermal expansion:** 998 to 931 kg/m³, about 7% in volume.
- **Heating steam condensing into the tank:** about 0.22 kg per kg of water (480 kJ/kg to heat against about 2160 kJ/kg latent heat), about 22% more mass.

Together about 31% more volume. A 38% cold fill ends at 50% hot; a 50% fill ends near 65% when nothing leaves the vessel, close to the high alarm (75%). The loop operator's level hold (#112) takes the surplus out through the condensation pump, so the golden path peaks at 55%. All figures are steady-state hand estimates.

- **Heating steam on a cold start** comes from the auxiliary line through the let-down valve ([ADR 0036](0036-deaerator-is-a-steam-heated-tank.md)); extraction is not available.
- If the condensation pump runs during warm-up, the level loop throttles it and absorbs part of the rise; otherwise the excess leaves through the overflow or dump valve.

## Considered options

- **Cold fill at 38%:** the original choice, it ends at 50% hot with no surplus. Replaced because the owner wants the vessel to start at its working level.
- **Cold fill at 50% (taken):** costs water: about 18 t more to heat and about 7 t more of the boiler's steam drawn through the let-down valve (the drum sinks to the burner low-low trip in `heat-up` unless fed), and the surplus water ends in the hotwell (78% at the `turbine-sync` snapshot, 56% before).
- **Fill to 50% and dump during heat-up:** rejected, it throws away treated water ([ADR 0018](0018-cold-fill-of-the-boiler.md) rejected the same).

## Consequences

- The vessel start state goes in `design-basis.md`; `deaerator.md` records the derivation.
- Scenarios that start from `makeInitialState()` change, and `sim/snapshots/` is regenerated.
- The `heat-up` operator feeds the drum with `holdHeatUpLevel` (as `bypass-loop` does, #137); without it the burner trips on low level at 19 680 s.
- The loop operator's reject edge is 80% (`HotwellBandHigh`, above the gauge's 75% band, under the 85% alarm): the water the fuller vessel adds then stays in the hotwell (79.1% peak) and the golden path rejects nothing. `max-output` allows a 6.05 bar pressure dip (4.7 before).
