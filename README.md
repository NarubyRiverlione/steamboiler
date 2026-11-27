# PowerPlant Simulator

A physics-based simulator of a steam power plant: a gas-fired boiler drives a turbine and generator, and a condenser returns the steam as water to the boiler. You run the plant by hand (burner, valves, pumps, generator breaker) and watch temperature, pressure, flow and electrical output respond in real time.

Formerly called Steamboiler. React + TypeScript + Vite, no backend.

**Try it:** <https://narubyriverlione.github.io/steamboiler/> (the latest release on `main`).

## The plant

![Schema of the plant: the water and steam loop, with gas heat coming in and the cooling water taking heat out](docs/plant/overview-schema.svg)

What each part does and where the energy comes from: [plant overview](docs/plant/overview.md).

## Purpose

An educational tool for the thermodynamics of steam generation and power production, without the risk or cost of a physical plant: a safe place to practise plant operation and start-up sequences, and to make the relationships between temperature, pressure, flow and energy tangible. For students, educators, professionals refreshing their knowledge and curious learners.

## Realism rule

The physics is realistic: a process is never sped up with a magic number, such as an inflated heat-transfer coefficient, a scaled-down heat capacity or a time multiplier. Playability comes from how the utilities are sized (gas flow, pump capacity). Every deliberate departure from a real plant is listed in the register in [docs/plant/design-basis.md](docs/plant/design-basis.md). See also [ADR 0001](docs/adr/0001-boiler-pressure-follows-saturation.md).

## Where we are

You can run the plant from a cold start to a generator on the line:

- **Start-up:** fill and heat the boiler, pull vacuum with the air extraction pump and the SJAE, admit steam, spin the turbine up to sync speed and close the generator breaker.
- **Plant parts:** burner and boiler with economizer, superheater with spray attemperator, turbine with an extraction heater, condenser with hotwell, and a deaerator with a boiler feed pump. Every stream carries its real enthalpy and the energy balance closes.
- **Protections:** relief valve; trips on low boiler water, high-high boiler level, vacuum loss, overspeed and high-high deaerator level; alarms and a reset for each latched trip.
- **Board:** an analog control-room style UI, with a parts overview and a page per part.
- **Testing:** unit tests plus golden-path and edge scenarios run by the [headless runner](docs/dev/headless-runner.md), with a CRAP-score check on changed code.

Not there yet: the plant is an island, with no grid to sync to, no load demand and no auxiliary power for its own pumps.

## Where we are going

The direction is a plant that serves a **town grid** whose demand follows a day-night cycle ([ADR 0046](docs/adr/0046-from-island-to-town-grid-in-milestones.md)), in milestones:

1. **M1:** on the grid with auto-sync, a MW load controller, reverse power trip
2. **M2:** the plant's own power: auxiliary load, grid supply, diesel island start
3. **M3:** the town grid: finite inertia, frequency from the balance of demand and supply, governor droop
4. **M4:** manual sync with a synchroscope
5. **M5:** operating for the town: load set from frequency and demand
6. **M6:** a 24-hour demand curve
7. **M7:** a satisfaction score and demand that grows

Alongside, smaller tickets add turbine auxiliaries (lube oil, turning gear, gland steam), more plant parts (reheat, air preheater), more protections and a shutdown scenario. The order is in [ROADMAP.md](ROADMAP.md).

## Releases

Work lands on `dev`, one ticket at a time, each through its test gate. `main` holds the milestone releases and is deployed to GitHub Pages on every merge. A release is a pull request from `dev`, merged once its gate (edge scenarios and speed guard, on top of the `dev` gate) is green. What and how: [docs/dev/branching.md](docs/dev/branching.md).

## Quick start

Requires Node 24+ and pnpm.

```sh
pnpm install
pnpm dev                 # run the app (reachable on the LAN)
pnpm test                # vitest: unit, golden, edge
pnpm lint                # eslint + tsc
pnpm sim bypass-loop     # headless scenario run, writes a CSV and HTML report to sim/reports/
pnpm sim:view            # run a scenario and serve the report on the LAN
```

The headless runner is how physics changes are judged: see [docs/dev/headless-runner.md](docs/dev/headless-runner.md).

## Documentation

Start at [docs/README.md](docs/README.md). The work order is in [ROADMAP.md](ROADMAP.md), generated from the GitHub issues. Domain terms are in [GLOSSARY.md](GLOSSARY.md).
