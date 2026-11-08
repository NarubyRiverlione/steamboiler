# Architecture

## Stack

React 19, TypeScript, Vite, react-router-dom, Vitest. CSS files per component. pnpm. No backend, no persistence: all state lives in memory for the session.

## State management

One reducer and one provider for the whole plant.

- `PowerPlantReducer` (`src/context/`) is the only state-transition point. It handles user actions and the tick.
- `PowerPlantProvider` owns the simulation loop and exposes state through `PowerPlantContext`.
- Simulation core is pure functions, decoupled from React: `PowerPlantTick` calls `BoilerTick`, `TurbineTick`, `CondenserTick` (in `src/context/<Subsystem>/`). Order per tick: the relief valve vents (`BoilerVent`), remove bypass steam, `TurbineTick`, remove turbine steam, `CondenserTick` with those same-tick flows, then `BoilerTick` with the return.
- Physics lives in `src/utils/` (`boilerCalculations`, `condenserCalculation`, `turbineCalculations`, `steamTable`, `steamData`).
- State is immutable. Every update creates a new state object.
- Display-only values are calculated in components, not stored in state. `useEMA` smooths readouts.

```mermaid
flowchart TD
    UI[UI components] -->|actions| Reducer[PowerPlantReducer]
    Loop[Simulation loop 20 Hz] -->|SIMULATE_TICKS n| Reducer
    Reducer --> Tick[PowerPlantTick]
    Tick --> B[BoilerTick]
    Tick --> T[TurbineTick]
    Tick --> C[CondenserTick]
    B & T & C --> Calc[utils calculations]
    Calc --> Steam[steam tables]
    Reducer --> State[PowerPlantState]
    State --> UI
```

## Simulation loop

`PowerPlantProvider` runs a `setInterval` every `UpdateInterval` (50 ms). Each update asks `ticksDue` (`Playback.ts`) how many fixed ticks the elapsed wall time earns at the chosen playback speed, and dispatches one `SIMULATE_TICKS` with that count: one render per update. `DeltaTime` stays 0.1 s; speed is ticks per wall-clock second, 1x = 10 per second ([ADR 0026](../adr/0026-playback-speed-is-ticks-per-second.md)). The count is capped at `MaxTicksPerUpdate`; above it the plant runs slower, no tick is skipped. A hidden tab and Pause run nothing and bank no time, so there is no catch-up.

`simulationReducer` (`SimulationReducer.ts`) wraps the plant reducer with state kept outside `PowerPlantState`: the tick count (the simulated clock, `ticks × DeltaTime`), the playback speed and the unacknowledged alarms. In the same step as a batch it applies the alarm rule: an alarm from the alarm list (`Alarms.ts`, the single source) that comes on stops the batch on that tick, drops the speed to 1x and locks higher speeds until ACK.

The header (`navigation/TimeControl.tsx`) shows the clock, the plain speed selector and an ACK button while the speed is locked. #86 restyles both.

Each subsystem uses an energy balance:

```
Boiler:    ΔE = gas input − (heat loss + steam generation + drain)   (E: water and metal)
Condenser: ΔE = steam input − (cooling + condensation)
```

## Source layout

```
src/
├── components/
│   ├── Boiler/ Condenser/ Turbine/   # Visual, Readouts, ControlPanel, controls per subsystem
│   ├── Indicator.tsx Readout.tsx ValveSlider.tsx
│   └── simulator.css                 # shared simulator styling
├── context/
│   ├── PowerPlant{Actions,Batch,Context,Provider,Reducer,State,Tick}
│   ├── SimulationReducer, Playback, Alarms   # clock, playback speed, alarm list
│   ├── const.ts                      # all tunable constants (Cst* objects)
│   └── Boiler/ Condenser/ Turbine/   # <Subsystem>Tick.ts
├── navigation/                       # routing, tab navigation, layout
└── utils/                            # calculations, steam tables, useEMA, average
sim/                                  # headless scenario runner, see headless-runner.md
├── scenarios/                        # one file per scenario, registered in index.ts
├── snapshots/                        # committed start states (JSON)
└── reports/                          # generated CSV + HTML, git-ignored
scripts/roadmap.ts                    # generates ROADMAP.md from the GitHub issues
```

## Conventions

- Constants use a `Cst` prefix (`CstPhysics`, `CstSimulation`, `CstTurbine`) and live in `src/context/const.ts`. Do not hardcode tunables in calculations.
- Components PascalCase, functions camelCase, types PascalCase. Use `type`, not `interface`. No `any`.
- Default exports where possible. Function components with hooks. Explicit parameter and return types.
- Context, provider and logic in separate files; components read state through the context hook. All calculations in `src/utils/`.
- One CSS file per component. Numbers formatted with `toFixed()` for display, 1 decimal.
- Do not change the eslint configuration.
- Units: °C, bar (vacuum in mbar), kJ for energy, litres for volume.

## Steam tables

`steamData.ts` holds IAPWS-IF97 saturation data from 80 °C to the critical point (373.946 °C, 220.64 bar): pressure, specific volume, enthalpy, specific heat, latent heat. `steamTable.ts` interpolates it linearly. `steamEntropyData.ts` is a second, pressure-keyed saturation table (hf, hg, sf, sg, 0.01–220 bar) for `getIsentropicEnthalpyDrop`, interpolated in ln(pressure) (#14). Outside that range:

- Above the critical point (temperature or pressure): clamp to the critical-point row, never throw
- Boiling point below the table: Antoine equation
- Latent heat below 80 °C: linear extrapolation
- Water properties below 80 °C: linear approximation

## Numerical stability

- Boiler pressure is the saturation pressure of the water temperature ([ADR 0001](../adr/0001-boiler-pressure-follows-saturation.md)); the flash that restores the steam inventory each tick is solved implicitly, because an explicit step oscillates near the critical point.
- Vacuum build-up and decay rates need careful tuning.
- Edge cases: empty boiler, temperatures or pressures beyond the table, very small steam mass (minimum threshold before it affects pressure).

## Testing and commands

Run at the repo root: `pnpm dev`, `pnpm test` (Vitest, 90% coverage target), `pnpm lint` (eslint + tsc). Physics changes are judged with the headless runner and guarded by its scenario and invariant tests: see [headless-runner.md](headless-runner.md). The full command list is in `CLAUDE.md`.
