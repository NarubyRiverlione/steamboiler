# The deaerator is filled cold to about 38% so it ends at 50% hot

**Status: accepted.** Decided in #40; built and checked in #119: the headless runner ends at 50.1% hot (`bypass-loop`) and 50.4% (`turbine-runup`). In the style of [ADR 0018](0018-cold-fill-at-35-percent.md).

Heating from 20 °C to 3 bar (134 °C) raises the level for two reasons:

- **Thermal expansion:** 998 to 931 kg/m³, about 7% in volume.
- **Heating steam condensing into the tank:** about 0.22 kg per kg of water (480 kJ/kg to heat against about 2160 kJ/kg latent heat), about 22% more mass.

Together about 31% more volume. To end at 50% hot the cold fill is about **38%**. A 50% cold fill reaches about 65% hot, close to the high alarm (70 to 75%). All figures are steady-state hand estimates.

- **Heating steam on a cold start** comes from the auxiliary line through the let-down valve ([ADR 0036](0036-deaerator-is-a-steam-heated-tank.md)); extraction is not available.
- If the condensation pump runs during warm-up, the level loop throttles it and absorbs part of the rise; otherwise the excess leaves through the overflow or dump valve.

## Considered options

- **Cold fill at 50%:** rejected, it ends near the high alarm and dumps water.
- **Fill to 50% and dump during heat-up:** rejected, it throws away treated water ([ADR 0018](0018-cold-fill-at-35-percent.md) rejected the same).

## Consequences

- The vessel start state goes in `design-basis.md`; `deaerator.md` records the derivation.
- Scenarios that start from `makeInitialState()` change, and `sim/snapshots/` is regenerated.
