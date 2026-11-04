# Design basis

What plant is being simulated: its size, its limits, and where it deliberately differs from a real plant. Values come from `src/context/const.ts` unless a row says otherwise.

The plant is a utility-scale, gas-fired drum boiler of roughly 150 MWe at the rated steam flow (about 130 MWe at full-gas steam). Its utilities are sized for a conventional 180–200 MWe unit ([sizing check](../research/2026-10-sizing-check.md)), but the plant has no superheater and expands saturated steam, which yields less per kilogram (decided in #14).

## Realism rule

The physics is realistic. A process is never sped up with a magic number, such as an inflated heat-transfer coefficient, a scaled-down heat capacity or a time multiplier.

Playability comes from how the utilities are sized: gas flow, pump capacity, valve flow and similar. A bigger burner heats the water faster for a physical reason, so the plant stays honest and the operator doesn't wait hours for a startup.

When that isn't enough, a value can be changed on purpose, but only if it is listed in the register below. That keeps the simulator honest about where it differs from a real plant.

## Deliberate departures from a real plant

Add a row when you over-dimension a utility or reduce something for playability.

| Item | Simulator | Realistic | Why | Constant |
|---|---|---|---|---|
| Boiler model (simplified) | one lumped vessel: one volume shared by water and steam, one temperature for water and steel | a steam drum and a lower drum joined by risers and downcomers, with natural circulation, swell and shrink, and a drum level in mm | model choice, not playability: the lumped vessel carries the energy, mass and pressure behaviour the operator works with; see [boiler.md](boiler.md#what-the-model-is-not) ([ADR 0019](../adr/0019-boiler-is-one-lumped-vessel.md)) | `BoilerTick` |
| Boiler volume (reduced) | 100 m³ total, 50 m³ water | about 200 m³ total, 100 m³ water (evaporator side 100–150 m³; with economizer and superheater 200–300 m³) | on purpose reduced: full gas heats from cold to 165 bar in about 3.8 min (230 s, measured, `boiler-low`) instead of 8–9 min; the 35 t cold fill (next row) shortens it further | `CstBoiler.TotalVolume`, `StartWaterVolume` |
| Cold fill (35% of the drum) | 35 m³ of water at ambient (35% of `TotalVolume`), thermal expansion brings it to the 50 m³ working level at 165 bar | a real unit fills the drum cold to a start-up level well below the working one, for the same reason: the water expands when heated | the water has to fit hot: cold at 50% the boiler held 49.9 t against 34.4 t at the working state, so about 15 t had to leave on the way up, and the hotwell had 2.5 t of room below the reject band ([ADR 0018](../adr/0018-cold-fill-at-35-percent.md)). Also a deliberate reduction: less water to heat takes the cold start to 165 bar from about 4.7 to 3.8 min at full gas | `CstBoiler.StartWaterVolume` |
| Heating-rate limit (relaxed) | 0.4 K/s (24 K/min), alarm only | about 100 K/h | time-compressed: cold start to working pressure takes about 16.3 min (980 s, measured, `heat-up`) instead of 4 to 8 h | `CstBoiler.HeatingRateLimit` |
| Water temperature (capped) | stops heating at the critical point, 373.946 °C | a boiler run dry overheats its metal and fails | model limit: the saturated model ends at the critical point, and a dry boiler with gas on would otherwise run away to NaN; with the metal mass a dry boiler heats to it at about 7 K/s; the burner trip ([boiler.md](boiler.md#burner-trip)) stops the gas before a boiler runs dry | `CriticalTemperature` (`src/utils/steamTable.ts`), used in `BoilerTick` |
| Specific heat at the critical point (held) | 47.1 kJ/kg·K from 370 °C up | diverges to infinity at 373.946 °C | the simulation core must stay finite every tick; the table clamps at the critical point instead of throwing | last row of `steamTable` in `steamData.ts` |
| Burner minimum firing (operator setting) | the scenario pressure hold never takes gas below 100 L/s (`PressureHoldSettings.GasFloor`); the plant itself can go to 0 | a burner cannot modulate to zero and stay lit; turn-down is about 1:10 to 1:20 | with gas at 0 for 2 minutes the hold's overshoot trips the cooldown invariant, which assumes a plant with gas off is cooling; not plant physics | `sim/scenarios/pressure-hold.ts` |

Basis for the realistic boiler volume (an engineering estimate, not a sourced data sheet): a drum of about 1.6–1.8 m inside diameter and 15–20 m long holds 35–50 m³, about half full of water; waterwall tubes and downcomers add roughly 80–120 m³. Heating 100 m³ of water plus the 100 t of steel from 20 °C to about 350 °C takes about 180 GJ, which is 8–9 minutes at the full 357 MW. The reduced 50 m³ with the 100 t of steel heats to 165 bar in about 4.3 minutes (measured). The single-lump boiler has a steam space equal to total minus water, filled with saturated steam (#12): at 165 bar (about 110 kg/m³) the 50 m³ steam space holds about 5.5 t, and a realistic 100 m³ steam space would hold about 11 t, more than a real drum, whose steam space is mostly the drum's upper half. Steam mass no longer feeds pressure, so this only sets how much water the steam inventory takes from the level.

Gas flow and the condensation pump are not departures: the sizing check found them sized for a conventional 200 MWe unit.

## Boiler

| | Value | Note |
|---|---|---|
| Total volume | 100 m³ | on purpose reduced, see the register |
| Working water volume | 50 m³ (50% of max) | the other 50 m³ is steam space; the boiler starts cold at 35 m³ and expands to it (see the register); the initial fills (`StartWaterVolume`, `HotwellStartVolume`) are specified in litres at ambient and converted to kg when the state is created ([ADR 0007](../adr/0007-water-state-is-mass-in-kg.md)) |
| Water capacity | 100 m³ of liquid | `CstBoiler.TotalVolume`, see [feedwater-loop.md](feedwater-loop.md#return-and-capacity) |
| Working pressure | 165 bar | typical utility drum boiler (2400 psi); not a code constant yet |
| Design pressure | 180 bar | must never be exceeded; the relief valve holds it while water remains (see [boiler.md](boiler.md#relief-valve)) |
| Design temperature | 357 °C | saturation at 180 bar |
| Max gas flow | 12 m³/s (12 000 L/s) | about 420 MW of fuel, in line with a conventional 200 MWe unit |
| Fuel power at max gas flow | ≈ 420 MW | 12 m³/s × 35 000 kJ/m³ |
| Heat into the water at max gas flow | ≈ 357 MW | 85% gas efficiency |
| Steam generation at full gas | 171 kg/s (about 615 t/h) | measured at 10 bar; a real unit of this size passes 170–180 kg/s |
| Relief valve | opens 178 bar, closes 171 bar, ≈ 497 kg/s | 110% of the steam full gas makes at 178 bar; realistic sizing, not a departure |
| Burner low-low level | 20% of the boiler volume (20 m³ of 100 m³) | UNVERIFIED: an own engineering estimate with no source; a real drum trips on a level in mm below normal, which this one-lump boiler has no measure for. The burner trips below it (`CstBoiler.BurnerLowLowLevel`, [ADR 0017](../adr/0017-burner-trips-on-low-water-level.md)) |

## Startup and heat loss

| | Value | Note |
|---|---|---|
| Metal mass (drum and tubes) | 100 t steel | 0.5 kJ/kg·K, added to the water's heat capacity at one lumped temperature (`CstBoiler.MetalMass`) |
| Heat loss | 0.5 MW at design temperature | proportional to the difference with ambient (`CstBoiler.HeatLossAtDesign`); about 3.6 K per hour at 190 °C, so a cooldown takes days |
| Heating-rate limit | 0.4 K/s (24 K/min), smoothed over 30 s | alarm only (`CstBoiler.HeatingRateLimit`, `HeatingRateWindow`); see the register and [ADR 0006](../adr/0006-heating-rate-alarm-only.md) |
| Cold start to working pressure | about 16.6 min with the gas ramped at the limit (measured, `heat-up`); about 4.3 min at full gas, over the limit | time-compressed: real cold startups take 4 to 8 h |

## Steam path and turbine

| | Value |
|---|---|
| Max steam removal per valve (turbine valve or bypass fully open, main steam valve open) | 200 kg/s each, so up to 400 kg/s with both |
| Main steam valve minimum pressure | 10 bar |
| Vacuum limit (turbine trip) | 327 mbar absolute (`CstCondenser.VacuumLimit`); see the source below |
| Sync speed | 3000 RPM (50 Hz grid) |
| Overspeed limit | 3300 RPM (110%) |
| Electric output at rated steam flow | ≈ 150 MWe | derived from the enthalpy drop (#14): isentropic efficiency about 0.85, generator efficiency about 0.98; about 130 MWe at the 171 kg/s of full gas. Hand estimate from textbook steam tables; re-check now that #22 is fixed |

Source of the vacuum limit: the low-vacuum electrical trip of a KWU-type (Siemens design) fossil turbine acts when "the Condenser pressure falls to -0.7Kg/cm2", from three vacuum switches in 2-out-of-3 logic ([KWU turbine interlocks, slide 7](https://www.slideshare.net/slideshow/steam-turbine-turbine-interlocks-for-kwu-turbine/71755509)). −0.7 kg/cm² gauge is 1013.25 − 0.7 × 980.665 ≈ 327 mbar absolute. The source is a training deck, not an OEM setting sheet, and does not state the unit size; this turbine type is built as 210 and 500 MW sets. Cross-check: the ABWR Design Control Document (Tier 2, §10.4.1.5.2) trips the turbine at 0.074 MPa vacuum, about 273 mbar absolute ([NRC ML103080368](https://www.nrc.gov/docs/ML1030/ML103080368.pdf)), on a ~1350 MWe nuclear unit. The limit is a real-plant value, not a departure. It sits above the 213 mbar the air extraction pump reaches on its own, so the SJAE is not needed to reach it, only to go deeper. Decision: [ADR 0003](../adr/0003-turbine-trip-on-vacuum-limit.md).

## Condenser and water loop

| | Value | Note |
|---|---|---|
| Hotwell total volume | 50 m³ | sized from condensate flow, not playability: 35 m³ below the 70% normal level is about 3.4 min of the 171 kg/s full-gas condensate, inside HEI's 1 to 5 min ([hotwell sizing](../research/2026-11-hotwell-sizing.md)); was 15 m³ (about 1 min), changed in #53 ([ADR 0009](../adr/0009-hotwell-sized-from-condensate-flow.md)) |
| Hotwell start volume | 35 m³ | 70%, inside the working band |
| Hotwell working band | 55% to 75%, centre 65% | operator policy, not plant: both valves shut inside it, fully open 15 points beyond an edge. Research shows normal level near 60 to 70% of height with makeup and reject within 5 to 15 points of it ([hotwell level control](../research/2026-11-hotwell-level-control.md), UNVERIFIED, no standard read) (#52, [ADR 0011](../adr/0011-hotwell-protections-in-the-tick.md)) |
| Hotwell low-low | 10% | pump trip, set by NPSH in a real plant (about 7.5% in the one worked example, UNVERIFIED); 10% here (#52) |
| Hotwell high-high | 95% | overfill clamp, reject forced open; real high-high is lower (about 75% of height, UNVERIFIED), 95% is the owner's figure used as the last-resort tier (#52) |
| Max vacuum | 1000 mbar (about 13 mbar absolute) | |
| Recirculation pump max flow | 3600 L/s | sized so the condenser keeps up on its real energy balance (no speed-up factor, removed in #47): full gas passes about 171 kg/s of exhaust, which at about 50 °C saturation with 10 °C intake water needs about 2400 L/s (a 213 mbar back-pressure, 61 °C, needs less) (Q = ṁ·cp·ΔT, ÷ latent heat); with the 1.5× margin of the condensation pump that is 3600 L/s. Checked in `pnpm sim`: 3600 L/s holds the former `turbine-sync` (removed in #60) at 213 mbar with no steam left over, 2400 L/s just keeps up and 1800 L/s lets steam pile up. A single-unit sea or river cooling circuit for a 200 MWe unit is larger, so no departure |
| Condensation pump max flow | 300 L/s | about 1.5× the full-gas steam flow, a normal feedwater margin |
