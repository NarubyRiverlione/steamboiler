# The water state is mass in kg; volume and level are derived

The boiler and the hotwell hold their liquid as **mass in kg** (`Boiler.waterMass`, `Condenser.hotwellWaterMass`). `waterVolume`, `hotwellWaterVolume` and the level are derived every tick as mass × `getWaterSpecificVolume(T)` at the vessel's own temperature, and written nowhere else. Decided in #34.

## Considered options

- **Keep litres as the state, 1 L = 1 kg (the state before this):** the steam made took `calculateWaterVolume(1, T)` litres (1.13–1.4 L) out of the boiler while the water invariant counted 1 L = 1 kg, so hot water showed up as lost water in four scenarios. Litres cannot conserve water when density changes with temperature.
- **Keep litres, fix the conversion at every transfer:** every transfer would convert at its own temperature and rounding would leak mass at each of them. Nothing in the state would be the conserved quantity.
- **Mass as the state, volume derived (chosen):** mass is what the loop conserves, so each transfer moves kg and the water invariant sums kg. Volume only matters for capacity and level, and is computed from the mass.

## Consequences

- One specific-volume function, `getWaterSpecificVolume(T)`, from 20 °C up (IAPWS-IF97 saturated liquid; the steam table from 80 °C, a short table below it). It replaces the flat 1000 kg/m³ fallback below 80 °C, the linear 0–80 °C fit and the separate density path, so there is no 1000 → 972 kg/m³ jump at 80 °C.
- The level rises as the water heats (about +40% from 20 to 300 °C). Bubble swell (void fraction) is out of scope.
- Room is converted at the vessel's temperature: boiler room (kg) = (`CstBoiler.TotalVolume` − boiler volume) ÷ specific volume at the boiler temperature; the hotwell likewise. The Return, condensation and makeup stop at that room (amends [ADR 0004](0004-return-stops-at-full-boiler.md)).
- Pump and valve flows stay in L/s. They are converted to kg at the temperature of the vessel the water leaves or enters (drain at the boiler temperature; makeup and reject at the hotwell temperature), and the `makeupTotal`, `rejectTotal` and `drainedTotal` totalizers count kg.
- A full drum that heats up is not clamped, because mass must be conserved: its derived volume goes over `CstBoiler.TotalVolume`, the steam space is floored at 0, and the "boiler water within capacity" invariant reports it. Protection is #33.
- The loop now conserves water to floating-point rounding, which let the water-invariant tolerances shrink from 0.1% to 1e-13 of the start mass ([headless-runner.md](../dev/headless-runner.md)).
- Initial fills stay in litres at ambient in `const.ts` and are converted to kg when the state is created.
- Heat modelling is unchanged (#13): `mixTemperature` weights by kg and the returned water still adds no heat to the boiler.
