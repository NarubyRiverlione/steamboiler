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

Every deliberate over-dimensioning is listed in the register below, so the simulator stays honest about where it departs from a real plant. Add a row when you over-dimension something new.

### Over-dimensioned utilities

| Utility | Simulator | Realistic | Constant |
|---|---|---|---|
| Max gas flow | 12 000 L/s | 700–900 L/s | `CstBoiler.MaxGasFlow` |
| Condensation pump max flow | 300 L/s | 160–270 L/s | `CstCondenser.CondensationPump_MaxFlowRate` |

## Major Dimensions

The plant is modelled on a utility-scale, gas-fired drum boiler. Values come from `src/context/const.ts`.

### Boiler

| | Value | Note |
|---|---|---|
| Total volume | 100 m³ | |
| Working water volume | 50 m³ (50% of max) | the other 50 m³ is steam space |
| Working (operating) pressure | 165 bar | typical utility drum boiler (2400 psi), not a code constant yet |
| Design (max) pressure | 180 bar | must never be exceeded; not enforced yet, see the relief valve ticket (#9) |
| Design (max) temperature | 357 °C | saturation at 180 bar |
| Max gas flow | 12 m³/s (12 000 L/s) | deliberately unrealistically high so the simulation reacts fast |
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
