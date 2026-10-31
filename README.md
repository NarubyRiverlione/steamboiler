# PowerPlant Simulator

PowerPlant Simulator is a comprehensive simulation of a steam power plant system. It models the thermodynamic processes involved in water heating, steam generation, condensation, and energy management to provide a realistic and educational experience.

## Overview

The project, formerly known as Steamboiler, has evolved to more accurately reflect the complete power plant cycle. It leverages modern web technologies including React, TypeScript, and the Context API with a centralized reducer pattern to ensure a robust and maintainable codebase.

## Key Features

- **Realistic Thermodynamics:** Simulates water heating, steam generation, and condensation dynamics.
- **Centralized State Management:** Uses a single PowerPlantProvider and PowerPlantReducer for predictable state updates.
- **Modular Architecture:** Organized into reusable components for simulation visualization and control panels.
- **Responsive UI:** Provides real-time readouts and control interfaces for manipulating simulation parameters.

## Design principle: realistic physics, generous utilities

The physics is realistic. A process is never sped up with a magic number, such as an inflated heat-transfer coefficient, a scaled-down heat capacity or a time multiplier.

Playability comes from over-dimensioning the utilities: gas flow, pump capacity, valve flow and similar. A bigger burner heats the water faster for a physical reason, so the plant stays honest and the operator doesn't wait hours for a startup.

The boiler volume is the one deliberate exception: it is on purpose smaller than a real boiler of this power, so the heat-up stays short. Every such departure is listed in the register below, so the simulator stays honest about where it differs from a real plant.

### Deliberate departures from a real plant

| Item | Simulator | Realistic | Why | Constant |
|---|---|---|---|---|
| Boiler volume (reduced) | 100 m³ total, 50 m³ water | about 200 m³ total, 100 m³ water (evaporator side 100–150 m³; with economizer and superheater 200–300 m³) | on purpose reduced: heat-up takes about 4.5 min instead of 8–9 min | `CstBoiler.TotalVolume`, `StartWaterVolume` |
| Heating-rate limit (relaxed) | 0.4 K/s (24 K/min), alarm only | about 100 K/h | time-compressed: cold start to working pressure takes about 15 min instead of 4 to 8 h | heating-rate limit constant (to be added in #13) |

Basis for the realistic figure (an engineering estimate, not a sourced data sheet): a drum of about 1.6–1.8 m inside diameter and 15–20 m long holds 35–50 m³, about half full of water; waterwall tubes and downcomers add roughly 80–120 m³. Heating 100 m³ of water plus the 100 t of steel from 20 °C to about 350 °C takes about 180 GJ, which is 8–9 minutes at the full 357 MW. The reduced 50 m³ heats in about 4.5 minutes. The single-lump boiler also has a steam space equal to total minus water, so at 165 bar a realistic 100 m³ would hold about 9 t of steam, more than a real drum.

Gas flow and the condensation pump are not departures: the sizing check below found them sized for a roughly 200 MWe plant. Add a row when you over-dimension a utility or reduce something else for playability.

### Sizing check (October 2026)

Steam flow was measured with the headless runner: from the `at-pressure` snapshot (10 bar), full gas, main steam valve and bypass open, boiler level held by the loop operator.

| | Result |
|---|---|
| Steam generation at full gas | 171 kg/s (about 615 t/h), steady, at 10.4 bar and 182 °C |
| Heat per kg of steam | 2.09 MJ/kg (357 MW ÷ 171 kg/s), consistent with the energy balance |
| Plant class | about 180–200 MWe; a real unit of that size passes about 170–180 kg/s |
| Max gas flow | 12 m³/s is about 420 MW of fuel, in line with a 200 MWe unit; the old "typical 700–900 L/s" comment describes a small industrial boiler |
| Condensation pump | 300 L/s is about 1.5× the 171 kg/s steam flow, a normal feedwater margin |
| Boiler volume | 100 m³ total, 50 m³ of water, on purpose reduced for playability (see the departures table); not verified against a real data sheet |

Not measured: generation near the 165 bar working pressure (estimated to be about the same).
The measured bypass flow was 342 kg/s, twice the generation and above the 200 kg/s valve limit, so the flow accounting needs checking.

## Major Dimensions

The plant is modelled on a utility-scale, gas-fired drum boiler. Values come from `src/context/const.ts`.

### Boiler

| | Value | Note |
|---|---|---|
| Total volume | 100 m³ | on purpose reduced for playability, realistic is about 200 m³ |
| Working water volume | 50 m³ (50% of max) | the other 50 m³ is steam space; realistic is about 100 m³ |
| Working (operating) pressure | 165 bar | typical utility drum boiler (2400 psi), not a code constant yet |
| Design (max) pressure | 180 bar | must never be exceeded; not enforced yet, see the relief valve ticket (#9) |
| Design (max) temperature | 357 °C | saturation at 180 bar |
| Max gas flow | 12 m³/s (12 000 L/s) | sized for a roughly 200 MWe plant, see the sizing check |
| Fuel power at max gas flow | ≈ 420 MW | 12 m³/s × 35 000 kJ/m³ |
| Heat into the water at max gas flow | ≈ 357 MW | 85% gas efficiency |

### Startup and heat loss (target values, not in code yet, see #13)

| | Value | Note |
|---|---|---|
| Metal mass (drum and tubes) | ≈ 100 t steel | 0.5 kJ/kg·K, added to the water's heat capacity |
| Heat loss | ≈ 0.5 MW at design temperature | proportional to the difference with ambient; cooldown takes days |
| Heating-rate limit | 0.4 K/s (24 K/min) | alarm only; the real limit is about 100 K/h |
| Cold start to working pressure | ≈ 15 min at the limit | time-compressed: real cold startups take 4 to 8 h |

### Steam path and turbine

| | Value |
|---|---|
| Max steam removal (main steam valve fully open) | 200 kg/s |
| Main steam valve minimum pressure | 10 bar |
| Sync speed | 3000 RPM (50 Hz grid) |
| Overspeed limit | 3300 RPM (110%) |
| Steam-to-electricity efficiency | 35% |

### Condenser

| | Value |
|---|---|
| Total volume | 15 m³ |
| Hotwell start volume | 10 m³ |
| Max vacuum | 1000 mbar (about 13 mbar absolute) |
| Recirculation pump max flow | 500 L/s |
| Condensation pump max flow | 300 L/s |

## Getting Started

1. **Installation:** Clone the repository and run the setup commands as detailed in the documentation.
2. **Development:** Use the provided scripts to run the simulation locally using modern build tools like Vite.
3. **Deployment:** Follow the deployment guidelines to build a production-ready version of the simulator.

## Future Enhancements

- Integration of additional simulation modules such as turbine power generation.
- Continuous improvements in simulation accuracy and performance optimization.
- Expansion of user interface features to include detailed visualization and historical data tracking.
