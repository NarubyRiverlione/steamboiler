# Lube oil: a pressure permissive to roll and a low-pressure trip

The turbine has a **lube oil header** with one **oil pump**, an operator action (`SET_OIL_PUMP`). The header pressure (`Oil.headerPressure`, bar g) is a first-order lag in `OilTick`: toward `NominalPressure` (1.0) with the pump running (time constant 5 s), toward 0 with it stopped (20 s, slower: the header drains through the bearings). Figures are in `CstOil`, with sources and their UNVERIFIED status in [research/2026-11-lube-oil.md](../research/2026-11-lube-oil.md) and [design-basis.md](../plant/design-basis.md). Decided in #145, M1 of [ADR 0048](0048-from-roll-on-demand-to-a-real-cold-start-in-milestones.md).

- **Permissive:** the turbine valve cannot be opened while the header pressure is below `PermissivePressure` (0.7 bar). The reducer refuses the opening silently, like the other refusals of [ADR 0043](0043-trip-reset.md); the Ramp up / Hold PID may not open the valve either. Closing is always allowed.
- **Trip:** while the turbine is **running**, header pressure below `TripPressure` (0.4 bar) trips it through `turbineTripped`: valve to 0, Free, integral cleared, as for the vacuum trip ([ADR 0003](0003-turbine-trip-on-vacuum-limit.md)). No delay. **Running** means the speed is above `RunningRPM` (100 rpm) or the turbine valve is open, so a rotor coasting with the valve shut still needs its oil, and a stopped turbine with no oil does not trip. `PowerPlantTick` evaluates it with the header pressure of the same tick, before any steam leaves.
- **Reset:** the trip is cleared only by the turbine trip reset ([ADR 0043](0043-trip-reset.md)), which is refused while the header pressure is below the trip limit (no hysteresis), on top of its other causes.
- **First cut:** the pump is a load on the auxiliary bus (#141, [ADR 0053](0053-the-auxiliary-bus-is-fed-by-the-grid-or-the-generator.md)): a dead bus stops it, and there is no emergency (coast-down) pump, no oil temperature, filter, cooler or bearing model. Stopping the only pump with the turbine running is therefore always a trip; the emergency pump is a follow-up. The turning gear (#146) needs the same permissive to engage ([ADR 0051](0051-turning-gear-holds-the-stopped-rotor-and-blocks-the-valve.md)).

## Considered options

- **A trip delay** (some plants delay 10 s, research note): rejected for the first cut; the 20 s decay already gives the operator time to see the pressure fall.
- **"Running" as rpm only:** rejected. The valve open at standstill is a turbine about to roll; it has no oil to roll on either.
- **Reading the oil in `TurbineTick`:** rejected for the trip. The trip is an outside cause like [ADR 0041](0041-boiler-high-high-level-trips-feed-pump-and-turbine.md); only the PID permissive is passed into `TurbineTick`.

## Consequences

- `PowerPlantState` gains `Oil` (`pumpRunning`, `headerPressure`); the cold plant starts with the pump stopped and the header empty. Every scenario that rolls the turbine starts the pump first (`oilPumpOn`); snapshots were regenerated for the new field.
- The app has no pump switch yet: until the follow-up `ui` ticket the app cannot start the pump, so the turbine cannot be rolled by hand in the app (the At pressure preset starts with the pump running).
