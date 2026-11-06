# Design basis

What plant is being simulated: its size, its limits, and where it deliberately differs from a real plant. Values come from `src/context/const.ts` unless a row says otherwise.

The plant is a utility-scale, gas-fired drum boiler of roughly 130 MWe at the rated steam flow (about 150 MWe at the valve capacity). Its utilities are sized for a conventional 180–200 MWe unit ([sizing check](../research/2026-10-sizing-check.md)), but the plant has no superheater and expands saturated steam, which yields less per kilogram (decided in #14).

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
| Feedwater heating (free) | the Return enters the boiler at no heat cost: about 900 kJ per kg of steam, about 397 kg/s at full gas and 165 bar (scaled from a run at 200 kg/s) | about 2400 kJ per kg, about 149 kg/s at full gas (hand calculation) | model gap, not playability: the rated steam flow stays at the 171 kg/s design figure until #74 | `PowerPlantTick.ts` |
| Heating-rate limit (relaxed) | 0.4 K/s (24 K/min), alarm only | about 100 K/h | time-compressed: cold start to working pressure takes about 16.3 min (980 s, measured, `heat-up`) instead of 4 to 8 h | `CstBoiler.HeatingRateLimit` |
| Water temperature (capped) | stops heating at the critical point, 373.946 °C | a boiler run dry overheats its metal and fails | model limit: the saturated model ends at the critical point, and a dry boiler with gas on would otherwise run away to NaN; with the metal mass a dry boiler heats to it at about 7 K/s; the burner trip ([boiler.md](boiler.md#burner-trip)) stops the gas before a boiler runs dry | `CriticalTemperature` (`src/utils/steamTable.ts`), used in `BoilerTick` |
| Specific heat at the critical point (held) | 47.1 kJ/kg·K from 370 °C up | diverges to infinity at 373.946 °C | the simulation core must stay finite every tick; the table clamps at the critical point instead of throwing | last row of `steamTable` in `steamData.ts` |
| Burner minimum firing (operator setting) | the scenario pressure hold never takes gas below 100 L/s (`PressureHoldSettings.GasFloor`); the plant itself can go to 0 | a burner cannot modulate to zero and stay lit; turn-down is about 1:10 to 1:20 | with gas at 0 for 2 minutes the hold's overshoot trips the cooldown invariant, which assumes a plant with gas off is cooling; not plant physics | `sim/scenarios/pressure-hold.ts` |
| Bypass steam heat (simplified) | bypass steam enters the condenser as plain vapour, charged the latent heat at condenser pressure | the throttled steam keeps its boiler enthalpy, so the heat to remove depends on the boiler pressure | model choice: under 1% off at 165 bar, about 8% too little at 10 bar; the exact heat model is parked in #82 ([ADR 0026](../adr/0026-exhaust-splits-by-quality-at-condenser-intake.md)) | `CondenserTick` |
| Exhaust quality ignores shaft speed (simplified) | the full `IsentropicEfficiency` × enthalpy drop is taken out of the steam at any rpm | a turbine running up converts less of the drop, so its exhaust quality is higher | model choice: it only matters during run-up, at a few kg/s; parked in #82 ([ADR 0026](../adr/0026-exhaust-splits-by-quality-at-condenser-intake.md)) | `getExhaustQuality` |

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
| Rated steam flow (steam generation at full gas) | 171 kg/s (about 615 t/h) | measured at 10 bar; a real unit of this size passes 170–180 kg/s. A design figure: at 165 bar the sim passes more, see the feedwater heating departure |
| Relief valve | opens 178 bar, closes 171 bar, ≈ 497 kg/s | 110% of the steam full gas makes at 178 bar; realistic sizing, not a departure |
| Burner low-low level | 20% of the boiler volume (20 m³ of 100 m³) | UNVERIFIED: an own engineering estimate with no source; a real drum trips on a level in mm below normal, which this one-lump boiler has no measure for. The burner trips below it (`CstBoiler.BurnerLowLowLevel`, [ADR 0017](../adr/0017-burner-trips-on-low-water-level.md)) |

## Startup and heat loss

| | Value | Note |
|---|---|---|
| Metal mass (drum and tubes) | 100 t steel | 0.5 kJ/kg·K, added to the water's heat capacity at one lumped temperature (`CstBoiler.MetalMass`) |
| Heat loss | 0.5 MW at design temperature | proportional to the difference with ambient (`CstBoiler.HeatLossAtDesign`); about 3.6 K per hour at 190 °C, so a cooldown takes days |
| Heating-rate limit | 0.4 K/s (24 K/min), smoothed over 30 s | alarm only (`CstBoiler.HeatingRateLimit`, `HeatingRateWindow`); see the register and [ADR 0006](../adr/0006-heating-rate-alarm-only.md) |
| Cold start to working pressure | about 16.3 min with the gas ramped at the limit (measured, `heat-up`); about 3.8 min at full gas, over the limit | time-compressed: real cold startups take 4 to 8 h |

## Steam path and turbine

| | Value |
|---|---|
| Valve capacity (turbine valve or bypass fully open, main steam valve open) | 200 kg/s each, so up to 400 kg/s with both; a valve limit, not a steady flow |
| Main steam valve minimum pressure | 10 bar |
| Vacuum limit (turbine trip) | 327 mbar absolute (`CstCondenser.VacuumLimit`); see the source below |
| Sync speed | 3000 RPM (50 Hz grid) |
| Overspeed limit | 3300 RPM (110%) |
| Electric output at rated steam flow | ≈ 131 MWe (171 kg/s, 165 bar, 100 mbar); ≈ 153 MWe at the 200 kg/s valve capacity | derived from the isentropic enthalpy drop of saturated steam (917 kJ/kg from 165 bar to 100 mbar, IF97) × `IsentropicEfficiency` 0.85 × `GeneratorEfficiency` 0.98 (#14, [ADR 0022](../adr/0022-electric-output-from-enthalpy-drop.md)). The 100 mbar back-pressure is the one the estimate assumed; at the 15 mbar the plant reaches at low load the valve capacity gives ≈ 179 MWe, at 327 mbar (vacuum limit) ≈ 134 MWe. The 200 kg/s and 171 kg/s values at 100 mbar are pinned by `TurbineTick.test.ts`; the 15 and 327 mbar values come from the same function and are not. |

### Turbine speed model figures

Sourced in [research/2026-11-turbine-runup-figures.md](../research/2026-11-turbine-runup-figures.md) for [ADR 0021](../adr/0021-turbine-runup-from-steam-power.md). In the code since #69 (`CstTurbine`), except the run-up rate, the run-up points and the hold engage window (#70, modes in ADR 0021).

| | Value in the code | Label | Note |
|---|---|---|---|
| Inertia constant H | 4 s (`InertiaConstant`), so J = 2·H·S/ω_s² ≈ 10,590 kg·m² at S = 130.6 MWe | range 2.5–6 s sourced; the single value is an estimate | S is the electric output above, derived from `RatedSteamFlow` and `RatedEnthalpyDrop`, not an MVA rating (about 15% more): power factor is ignored, within the uncertainty of H |
| Loss power versus speed | ∝ ω³ | estimate for a steam turbine (windage form sourced, 2.7–3; bearings not found) | |
| No-load steam flow | 3% of rated flow (`NoLoadFlowFraction`): 5.1 kg/s at the rated drop, about 4.0 MW of shaft power lost at sync speed | sourced: 3% roll-up flow (US4656335) at the top of the sourced 1.5–3% (1.5% mechanical loss, Kraut); the ADR's 5–10% had no primary source and would mean 6.5–13 MW | decided in #69. The unloaded speed holds at the flow where drive equals loss: the flow scales with 1/(enthalpy drop), so at the 1082 kJ/kg the plant reaches at 13 mbar the same speed needs 4.3 kg/s |
| Run-up rate, cold | 50 rpm/min (sourced range 25–50) | sourced, one 518 MW unit | `RunUpRate` (#70). The sim always starts cold, so this is its rate. A cold run-up to 3000 rpm takes 60 min of sim time |
| Run-up rate, hot | 100–300 rpm/min | **estimate**, no source | deliberate simplification: the sim has one rate |
| Run-up points | 500, 1500, 2500 and 3000 rpm | owner's choice, no source | `RunUpPoints` (#70). The research only has example hold speeds (300–500 rpm; 600, 1200 and 2400 rpm UNVERIFIED). No minimum time at a point: the sim has no rotor temperature, so a soak would have no effect, and the sim has no critical speeds to keep the points away from |
| Hold engage window | ±5 rpm of the selected run-up point | **estimate**, no source | `HoldEngageWindow` (#70). The owner's choice: Hold engages at its target, and Ramp up arrives inside it |
| Speed tolerance at no load | governor droop 5% sourced; hold band stays ±2 rpm | band is an estimate | |

Simplifications of the speed model: no generator load torque on the shaft (#71), no overspeed trip (#72; the linear torque curve gives zero torque at twice sync speed, and a cracked turbine valve would spin the unloaded rotor past `MaxRPM`: 10 kg/s at 5% against about 4.3 kg/s of no-load flow, so `turbine-runup` builds pressure on the bypass and lets Ramp up open the turbine valve), one lumped shaft line for turbine and generator, and the loss exponent fixed at 3.

Source of the vacuum limit: the low-vacuum electrical trip of a KWU-type (Siemens design) fossil turbine acts when "the Condenser pressure falls to -0.7Kg/cm2", from three vacuum switches in 2-out-of-3 logic ([KWU turbine interlocks, slide 7](https://www.slideshare.net/slideshow/steam-turbine-turbine-interlocks-for-kwu-turbine/71755509)). −0.7 kg/cm² gauge is 1013.25 − 0.7 × 980.665 ≈ 327 mbar absolute. The source is a training deck, not an OEM setting sheet, and does not state the unit size; this turbine type is built as 210 and 500 MW sets. Cross-check: the ABWR Design Control Document (Tier 2, §10.4.1.5.2) trips the turbine at 0.074 MPa vacuum, about 273 mbar absolute ([NRC ML103080368](https://www.nrc.gov/docs/ML1030/ML103080368.pdf)), on a ~1350 MWe nuclear unit. The limit is a real-plant value, not a departure. It sits above the 213 mbar the air extraction pump reaches on its own, so the SJAE is not needed to reach it, only to go deeper. Decision: [ADR 0003](../adr/0003-turbine-trip-on-vacuum-limit.md).

## Condenser and water loop

| | Value | Note |
|---|---|---|
| Hotwell total volume | 50 m³ | sized from condensate flow, not playability: 35 m³ below the 70% normal level is about 3.4 min of the 171 kg/s full-gas condensate, inside HEI's 1 to 5 min ([hotwell sizing](../research/2026-11-hotwell-sizing.md)); was 15 m³ (about 1 min), changed in #53 ([ADR 0009](../adr/0009-hotwell-sized-from-condensate-flow.md)) |
| Hotwell start volume | 35 m³ | 70%, inside the working band |
| Hotwell working band | 55% to 75%, around the 70% normal level | operator policy, not plant: both valves shut inside it, fully open 15 points beyond an edge. Research shows normal level near 60 to 70% of height with makeup and reject within 5 to 15 points of it ([hotwell level control](../research/2026-11-hotwell-level-control.md), UNVERIFIED, no standard read) (#52, [ADR 0011](../adr/0011-hotwell-protections-in-the-tick.md)) |
| Hotwell low-low | 10% | pump trip, set by NPSH in a real plant (about 7.5% in the one worked example, UNVERIFIED); 10% here (#52) |
| Hotwell high-high | 95% | overfill clamp, reject forced open; real high-high is lower (about 75% of height, UNVERIFIED), 95% is the owner's figure used as the last-resort tier (#52) |
| Max vacuum | 1000 mbar (about 13 mbar absolute) | |
| Recirculation pump max flow | 3600 L/s | sized from the real heat load on its energy balance (no speed-up factor, removed in #47): only the vapour share of the exhaust needs cooling, about 273 MW at the rated 171 kg/s (exhaust quality about 0.66, [ADR 0026](../adr/0026-exhaust-splits-by-quality-at-condenser-intake.md)). 3600 L/s carries that with about an 18 K rise (Q = ṁ·cp·ΔT), so with 10 °C intake water saturation sits near 28 °C, about 38 mbar. Measured on `CondenserTick` (171 kg/s, 165 bar, full recirculation, last hour of two): mean saturation 28 °C, condensation 171 kg/s, pressure cycling 16–64 mbar around a mean of 41 mbar, well under the vacuum limit. The cycle comes from the steam-mass pressure term feeding back through the vacuum. Not resized in #81. A single-unit sea or river cooling circuit for a 200 MWe unit is larger, so no departure |
| Condensation pump max flow | 300 L/s | about 1.5× the full-gas steam flow, a normal feedwater margin |
