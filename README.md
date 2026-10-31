# PowerPlant Simulator

A physics-based simulator of a steam power plant: a gas-fired drum boiler drives a turbine and generator, and a condenser returns the steam as water to the boiler. You run the plant by hand (burner, valves, pumps, generator breaker) and watch temperature, pressure, flow and electrical output respond in real time.

Formerly called Steamboiler. React + TypeScript + Vite, no backend.

## Purpose

An educational tool for the thermodynamics of steam generation and power production, without the risk or cost of a physical plant.

- **Engineering training**: a safe place to practise plant operation and startup sequences
- **Visualisation**: makes the relationships between temperature, pressure, volume and energy tangible
- **Education**: for students, educators, professionals refreshing their knowledge and curious learners

## Realism rule

The physics is realistic: a process is never sped up with a magic number, such as an inflated heat-transfer coefficient, a scaled-down heat capacity or a time multiplier. Playability comes from how the utilities are sized (gas flow, pump capacity). Every deliberate departure from a real plant is listed in the register in [docs/plant/design-basis.md](docs/plant/design-basis.md). See also [ADR 0001](docs/adr/0001-boiler-pressure-follows-saturation.md).

## UX goals

1. **Intuitive controls**: direct control over the key parameters (gas flow, valves, pumps, breaker)
2. **Real-time feedback**: visual and numerical response to every change
3. **Educational insight**: show the relationships between the physical quantities
4. **Realistic behaviour**: the simulation matches real-world intuition

## Use cases

1. **Basic operation**: heat the boiler with gas and watch steam develop
2. **Parameter exploration**: vary gas flow and water level, and see temperature, pressure and steam rate respond
3. **Thermodynamic analysis**: boiling point against pressure, where the energy goes
4. **System control**: hold a condition (pressure, RPM, output) by adjusting the inputs
5. **Full power-up**: pull vacuum, admit steam, spin up to sync speed, close the generator breaker

## Success criteria

- Correct thermodynamics, with an energy balance throughout
- Clear visualisation of processes you can't see
- Realistic response to inputs
- Numerically stable, even under extreme conditions

## Quick start

Requires Node 24+ and pnpm.

```sh
pnpm install
pnpm dev                 # run the app (reachable on the LAN)
pnpm test                # vitest
pnpm sim bypass-loop     # headless scenario run, writes a CSV and HTML report to sim/reports/
pnpm sim:view            # run a scenario and serve the report on the LAN
```

The headless runner is how physics changes are judged: see [docs/dev/headless-runner.md](docs/dev/headless-runner.md).

## Documentation

Start at [docs/README.md](docs/README.md). The work order is in [ROADMAP.md](ROADMAP.md), generated from the GitHub issues. Domain terms are in [GLOSSARY.md](GLOSSARY.md).
