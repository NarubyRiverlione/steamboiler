# The hotwell is sized from condensate flow: 50 m³

The hotwell was 15 m³, a value with no source behind it. Real hotwells are sized as minutes of total condensate flow: HEI Tech Sheet 136 gives "1 to 5 minutes of total condensate flow", converted to the volume that sets the normal level. At the full-gas condensate flow of 171 kg/s, 15 m³ held about 1 minute below a 70% normal level, the very bottom of that range. Decided in #53; sources and arithmetic in [research/2026-11-hotwell-sizing.md](../research/2026-11-hotwell-sizing.md).

The hotwell is now 50 m³ (`CstCondenser.TotalVolume`), and the plant starts it at 35 m³ (`HotwellStartVolume`, 70%, the normal level). Below normal that is 35 m³, about 3.4 minutes of full-gas condensate. Above normal there is 15 m³ of surge room. All three hard volume data points (Waterford 3, TMI-1, ABWR) are nuclear units; the fossil figure (3 minutes from normal to low-low, CEA) is UNVERIFIED. The sim has no heater drains, so all condensate is turbine or bypass steam and the size follows that flow, not the MW rating.

## Considered options

- **Keep 15 m³ and record it as a deliberate reduction:** nothing about playability needs a small hotwell, so there is nothing to record it for; it only made the level fast and the makeup and reject churn.
- **Size it to hold the boiler's water at a trip (≥ 50 m³ of free room):** real plants put that inventory in the condensate storage tanks (TMI-1 has two of 265,000 gal next to a 154,000 gal hotwell), not the hotwell.
- **Size on 200 kg/s (one valve fully open), about 60 m³:** the full-gas flow is the plant's continuous rating; 200 kg/s is a valve limit, not a steady flow.
- **50 m³, about 3 minutes at full gas (chosen):** the middle of HEI's range, and in line with three ways of counting the minutes (HEI, CEA and TMI-1/ABWR proportions all give 45 to 55 m³).

## Consequences

- The loop holds 25 t more water at the start.
- In `bypass-loop` the hotwell level stays between 65.6% and 75%, makeup never opens (it was 23.6 t at 15 m³) and reject drops from 37.3 t to 13.8 t.
- `startup-cold`: the level swing narrows from 25.5–75% to 57.6–75%, makeup drops from 32.6 t to 4.9 t and reject from 45.6 t to 19.6 t.
- One percent of level is now about 3 s of a 167 kg/s imbalance instead of 0.9 s, so the band of #52 has room to work; it should be set after this volume.
