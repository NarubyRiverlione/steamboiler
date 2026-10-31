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
| Boiler volume (reduced) | 100 m³ total, 50 m³ water | about 200 m³ total, 100 m³ water (evaporator side 100–150 m³; with economizer and superheater 200–300 m³) | on purpose reduced: heat-up takes about 4.5 min instead of 8–9 min | `CstBoiler.TotalVolume`, `StartWaterVolume` |
| Heating-rate limit (relaxed) | 0.4 K/s (24 K/min), alarm only | about 100 K/h | time-compressed: cold start to working pressure takes about 15 min instead of 4 to 8 h | heating-rate limit constant (to be added in #13) |

Basis for the realistic boiler volume (an engineering estimate, not a sourced data sheet): a drum of about 1.6–1.8 m inside diameter and 15–20 m long holds 35–50 m³, about half full of water; waterwall tubes and downcomers add roughly 80–120 m³. Heating 100 m³ of water plus the 100 t of steel from 20 °C to about 350 °C takes about 180 GJ, which is 8–9 minutes at the full 357 MW. The reduced 50 m³ heats in about 4.5 minutes. The single-lump boiler also has a steam space equal to total minus water, so at 165 bar a realistic 100 m³ would hold about 9 t of steam, more than a real drum.

Gas flow and the condensation pump are not departures: the sizing check found them sized for a conventional 200 MWe unit.

## Boiler

| | Value | Note |
|---|---|---|
| Total volume | 100 m³ | on purpose reduced, see the register |
| Working water volume | 50 m³ (50% of max) | the other 50 m³ is steam space |
| Water capacity | 100 m³ of liquid | `CstBoiler.TotalVolume`, see [feedwater-loop.md](feedwater-loop.md#return-and-capacity) |
| Working pressure | 165 bar | typical utility drum boiler (2400 psi); not a code constant yet |
| Design pressure | 180 bar | must never be exceeded; not enforced yet (#9) |
| Design temperature | 357 °C | saturation at 180 bar |
| Max gas flow | 12 m³/s (12 000 L/s) | about 420 MW of fuel, in line with a conventional 200 MWe unit |
| Fuel power at max gas flow | ≈ 420 MW | 12 m³/s × 35 000 kJ/m³ |
| Heat into the water at max gas flow | ≈ 357 MW | 85% gas efficiency |
| Steam generation at full gas | 171 kg/s (about 615 t/h) | measured at 10 bar; a real unit of this size passes 170–180 kg/s |

## Startup and heat loss (target values, not in code yet, see #13)

| | Value | Note |
|---|---|---|
| Metal mass (drum and tubes) | ≈ 100 t steel | 0.5 kJ/kg·K, added to the water's heat capacity |
| Heat loss | ≈ 0.5 MW at design temperature | proportional to the difference with ambient; cooldown takes days |
| Heating-rate limit | 0.4 K/s (24 K/min) | alarm only; see the register |
| Cold start to working pressure | ≈ 15 min at the limit | time-compressed: real cold startups take 4 to 8 h |

## Steam path and turbine

| | Value |
|---|---|
| Max steam removal per valve (turbine valve or bypass fully open, main steam valve open) | 200 kg/s each, so up to 400 kg/s with both |
| Main steam valve minimum pressure | 10 bar |
| Sync speed | 3000 RPM (50 Hz grid) |
| Overspeed limit | 3300 RPM (110%) |
| Electric output at rated steam flow | ≈ 150 MWe | derived from the enthalpy drop (#14): isentropic efficiency about 0.85, generator efficiency about 0.98; about 130 MWe at the 171 kg/s of full gas. Hand estimate from textbook steam tables; re-check after #22 |

## Condenser and water loop

| | Value | Note |
|---|---|---|
| Total volume | 15 m³ | |
| Hotwell start volume | 10 m³ | |
| Max vacuum | 1000 mbar (about 13 mbar absolute) | |
| Recirculation pump max flow | 500 L/s | |
| Condensation pump max flow | 300 L/s | about 1.5× the full-gas steam flow, a normal feedwater margin |
