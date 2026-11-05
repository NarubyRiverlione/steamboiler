# A finer steam table above 300 °C smooths the steam density slope

Steam density comes from Clausius-Clapeyron, `vg = vf + hfg / (T · dP/dT)`, with `dP/dT` a ±5 K central difference over the piecewise-linear table pressure. With rows 10-20 K apart above 300 °C the slope of the density stepped where the window reached a node, and the steam inventory rate jumped with it. Decided in #46.

## Considered options

- **Natural cubic splines through the table (tried on `fix-steam-density-kink-46`):** the smoothest result (largest slope step 0.08 kg/m³ per K) and on target at 300 °C, but it changes the liquid volume and latent heat values too, adds a wobble under 1% between 80 and about 90 °C (1 K rows with 3-decimal pressures) and is code the table alone does not need.
- **dP/dT from a Wagner / IF97 saturation-pressure formula (the triage brief):** the cleanest physics, only the slope changes. Not built: it needs a second source of truth next to the table.
- **A finer table above 300 °C (chosen):** rows every 1 K from 300 to 370 °C, generated from IAPWS-IF97 like the rest of the table. No new code; the binary-search lookup (#73) makes the extra rows free. The largest slope step over 300-360 °C is 0.10 kg/m³ per K (0.65 before).

## Consequences

- `steamData.ts` has 71 more rows; every consumer of the table (boiling point, latent heat, water volume, specific heat) sees finer interpolation, and the snapshots moved slightly.
- The slope still steps near the critical point, and the density dips about 1% between 369.5 and 370 °C: the last 1 K row (370 °C) is 3.9 K below the critical-point row, and the ±5 K window reaches it. The relief valve (178 bar, 357 °C) keeps the plant out of it, so no rows were added there.
- The density at 300 °C is 1.2% below IF97 (the central difference of a convex curve is high); it was 2.9% above.
- A unit test guards the slope step over 300-360 °C (`steamTable.test.ts`). The scenarios cannot: `relief-lift` now stays at 352 °C and `turbine-runup` holds 349-352 °C, so neither crosses the old nodes.
- Below 80 °C nothing changes: Antoine pressure and ideal-gas vapour density.
