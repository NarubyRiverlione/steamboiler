# Status and backlog

The project is paused. See `CLAUDE.md` for the current plan; the next step is the headless scenario runner in [headless runner.md](headless%20runner.md).

## What works

**Simulation**
- Energy-balance boiler: temperature-dependent water properties, steam-table volumes, boiling point from pressure, steam removal via the main steam valve, configurable pressure parameters
- Condenser: CAR and SJAE vacuum with decay and auto-disable, hotwell, recirculation and condensation pumps, energy-balance condensation
- Turbine: RPM physics, PID hold mode, electricity only at rated RPM

**UI**
- Boiler visual with water level and steam, gas controls (fine and coarse), fill and drain valves, main steam valve in 10% steps, live readouts
- Condenser pressure readout with high/low indicators, CAR/SJAE/pump controls
- Turbine RPM readout, set point slider, free/hold toggle

**Technical**
- Context and reducer state, 10 Hz loop, steam-table interpolation, PID controller, EMA smoothing (`useEMA`)

## Backlog

- Turbine Phase 4 (generator breaker) and Phase 5 (synchronisation), see [turbine.md](turbine.md)
- Aerator between condenser and boiler
- Turbine valve must not open if condenser pressure is outside the bell curve
- Continuous-fire valve buttons: `ValveSlider` fires repeatedly (~150 ms) while a control button is held down. Evaluate UX impact first.
- More detailed visualisation of internal processes; historical gauges
- Reduce empirical approaches, see the lists in [boiler.md](boiler.md) and [condensor plan.md](condensor%20plan.md)
- Performance monitoring and optimisation, low priority: [performance.md](performance.md)
- Physics roadmap: [improvements.md](improvements.md), energy-balance steam generation first

## Known issues

See [known-issues.md](known-issues.md).
