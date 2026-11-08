# The turbine exhaust splits by its quality at the condenser intake

All steam entering the condenser joined one steam pool and was charged the full latent heat at condenser pressure. With no superheater the turbine exhaust carries moisture: about two-thirds vapour by mass at 165 bar to 100 mbar, so it was charged about 1.5× too much and 25% on the turbine valve behaved exactly like 25% on the bypass. Decided in #81.

## Considered options

- **Tracked pool energy:** the steam pool carries its enthalpy, and condensation removes energy instead of mass at the latent heat. The most exact, but a second state beside the mass, for a gain the bypass does not need. Parked in #82.
- **Flow-weighted heat per kg:** one heat per kg for the pool, weighted by what flows in this tick. It keeps a single pool but charges steam already in the pool at the heat of the newest flow, so it is wrong whenever the two flows change. Rejected.
- **Split at the intake by exhaust quality (chosen):** the vapour joins the pool, the moisture goes straight to the hotwell. The pool then holds only vapour, so `Q / latent heat` stays right and `calculateCondensation` does not change.

## Decision

- Exhaust quality comes from the exhaust enthalpy, the inlet enthalpy minus `IsentropicEfficiency` × the enthalpy drop, at the live condenser pressure: the same drop and pressures as the turbine speed model (`getExhaustQuality`). It is limited to 0–1, and is 1 with a zero or negative drop.
- Moisture enters the hotwell in the tick it arrives, at the saturation temperature like other condensate, and costs the cooling water nothing (the shell holds no steam pool since #91, [ADR 0035](0035-condenser-pressure-is-vapour-plus-air.md)).
- Moisture that does not fit in the room left in the hotwell is vented through the hood relief (`Condenser.ventedTotal`), so the water count keeps it (was: it joined the steam pool, gone in #91).
- `condensationRate` counts everything entering the hotwell, moisture included. `intakeFlowRate` stays the total of exhaust and bypass.

## Consequences

- At rated output (`turbine-load`, 130.6 MW before #74) the condenser settled at 39–40 mbar instead of 69 mbar, and the better vacuum took 162 kg/s of steam instead of 170. After #74 rated output was 123.0 MW, 150 kg/s and 33 mbar; after #82 `turbine-load` carries 125 MW at 152 kg/s and 29 mbar ([ADR 0032](0032-limited-condenser-and-stream-enthalpy.md)).
- The bypass was plain vapour on the latent heat, under 1% off at 165 bar and about 8% at 10 bar. ADR 0032 (#82) puts every stream on its real enthalpy, so that departure is gone.
- Quality used to ignore shaft speed. ADR 0032 (#82) takes the exhaust enthalpy from the work the shaft actually took, so a turbine running up has a drier exhaust and a standing one passes the inlet steam.
- The exhaust holds far more moisture than a real last stage allows, a result of having no superheater. Moisture is not a turbine limit here.
- The recirculation pump kept its 3600 L/s then, with a note starting from the real heat load; #82 re-sized it to 7400 L/s with a limited exchanger ([design-basis.md](../plant/design-basis.md#condenser-and-water-loop)).
- Goal check: `sim/golden/exhaust-split.test.ts`, the same 25% through the bypass and the turbine valve from `bypass-loop` no longer gives the same condenser.
- The fixed `steamOutflowTemperature` and `steamOutflowPressure` are gone, as are the unused `temp` and `pressure` condenser inputs.
