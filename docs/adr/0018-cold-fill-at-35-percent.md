# The boiler is filled cold to 35% so it expands to the working level

**Status: accepted** for the cold fill. The rest of the startup procedure is still open for discussion.

The boiler starts cold at **35% of `TotalVolume`** (35 m³ at ambient, about 34.9 t) instead of the 50% working level (`StartWaterVolume`). During heat-up the water expands on its own to about 50% at 165 bar. Implemented in #65.

This is the sim's equivalent of real practice, not a copy of it. Our startup research says a real drum is filled to its normal level ([2026-10-startup-procedure.md](../research/2026-10-startup-procedure.md), step 3). There the waterwall tubes stay full and the swell only shows in the drum, where blowdown brings it down. The one-lump boiler shows the whole expansion as level, so it starts low instead.

## Why

In the `bypass-loop` run of 2026-11-03 (`sim/reports/bypass-loop-2026-11-03_193728.csv`), 12.0 t was rejected. 10.2 t of it went out before the boiler reached pressure (t ≈ 2100 s), and only about 1.9 t in the 5000 s at 165 bar after that. The reject comes from thermal expansion during heat-up, not from the loop itself:

| | Water | Steam in the boiler | Inventory |
|---|---|---|---|
| Cold, 50% (t = 0) | 49.9 t at 998 kg/m³ | ~0 | 49.9 t |
| Hot, 54% (t = 7190 s) | 31.2 t at ~575 kg/m³ | 5.2 t at ~113 kg/m³ | 36.4 t |
| Hot, 50% (derived) | 28.8 t | 5.7 t | ~34.4 t |

The boiler holds about 34.4 t at the working level when hot. Filled cold to 50% it holds 49.9 t, so about 15 t has to leave the boiler on the way up. That water goes to the hotwell, which has only 2.5 t of room between its normal level (70%) and the reject band (75%), so the rest is rejected. Filled cold to 35% (34.9 t), the boiler starts with about what it holds hot at 50%, and nothing has to be pushed out.

Approximate level on the way up (35 m³ cold, the pump feeding only what the bypass takes, the steam space taking its saturated share): about 36% at 100 °C, 39% at 180 °C (10 bar, the main steam valve opens), 42% at 250 °C, 46% at 300 °C and about 50% at 350 °C.

## Considered options

- **Start the hotwell lower:** rejected. To take up about 12 t it would have to start at about 23 m³ (46%). That is below the makeup band (55%), so makeup opens at t = 0 and refills it, unless the band moves as well. The hotwell would then run away from its 70% normal level and lose some of the condensate margin it is sized for ([ADR 0009](0009-hotwell-sized-from-condensate-flow.md)). The extra water starts in the boiler, so the boiler is the place to fix it.
- **Cold fill at 40%:** rejected. 39.9 t is still about 5.5 t more than the hot inventory, more than the hotwell's 2.5 t of room, and the hotwell swings by about ±1 t at steady state on top of that. Several tonnes would still be rejected.
- **Keep 50% and accept the reject:** possible. Reject goes to storage, as it would in a real plant, so nothing is lost. But the start then always throws about 12 t to storage and brings it back later, and the run shows a reject the operator never asked for.
- **Keep 50% and drain or blow down during heat-up:** realistic (drums are blown down during startup), but it throws away hot treated water and gives the operator one more thing to do. The boiler drain already exists; this can come back as a procedure option.

## Consequences

- `CstBoiler.StartWaterVolume` becomes 35 000 L. Its comment ("60-70% water volume") is outdated and goes. `design-basis.md` and `boiler.md` record the cold fill and where it comes from.
- 35% is well above the burner low-low level of 20% ([ADR 0017](0017-burner-trips-on-low-water-level.md)), with about 15 m³ of margin cold.
- **The operator has to change as well.** `holdBoilerLevel` holds 50% ± 5% by volume from the moment the main steam valve opens. At that moment the level is about 39%, so it would feed straight up to 45–50%. That water expands again and is rejected anyway, about 4 t. So the operator keeps the main steam valve shut during heat-up, and the mass stays constant while the swell brings the level up. At working pressure it opens the valve, sets the bypass to its load opening and starts the level hold. With the valve shut the vacuum still comes up: the SJAE takes its motive steam from the boiler, not through the main steam valve, as on a real cold start on auxiliary steam ([2026-11-sjae-motive-steam.md](../research/2026-11-sjae-motive-steam.md)). This is the loop operator of `bypass-loop`. `turbine-runup` keeps its timed opening of the main steam valve at 780 s, now with the bypass cracked to 5% instead of the turbine valve (ADR 0021): it has no boiler level hold until working pressure (`startupOperator` passes `holdLevel` false to `holdLoop` until `atWorkingPressure`, #79), so it feeds and rejects nothing either.
- The heat-up is shorter: there is less water to heat, and no steam goes to the condenser before working pressure (in the 2026-11-03 run the bypass took about 40 t, roughly 80 GJ, during heat-up). This comes from a different start state, not from a speed-up, so it is not a playability shortcut under the realism rule.
- The scenarios that start from `makeInitialState()` change, and `sim/snapshots/` has to be regenerated. Expected result in `bypass-loop`: a `rejectTotal` close to 0 during heat-up.
- The 34.4 t hot inventory is measured from one run with a lumped boiler. If the steam-space model changes, the cold fill has to be derived again.
