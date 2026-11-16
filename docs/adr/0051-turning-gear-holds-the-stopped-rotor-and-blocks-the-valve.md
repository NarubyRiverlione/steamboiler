# Turning gear: a manual gear holds the stopped rotor and blocks the turbine valve

The turbine has a **turning gear**, an operator switch (`SET_TURNING_GEAR`, state `Turbine.turningGearEngaged`). Engaged, it turns the stopped rotor at `CstTurningGear.Rpm` (3 rpm). Decided in #146, M1 of [ADR 0048](0048-from-roll-on-demand-to-a-real-cold-start-in-milestones.md); the figures are UNVERIFIED, see [research/2026-11-turning-gear.md](../research/2026-11-turning-gear.md) and [design-basis.md](../plant/design-basis.md).

- **Manually engaged gear:** the operator disengages it by hand before rolling. While it is engaged the turbine valve cannot be opened: the reducer refuses an opening silently like the other refusals of [ADR 0043](0043-trip-reset.md), and the Ramp up / Hold PID may not open it either (`TurbineTick` takes one roll permissive: oil pressure at the permissive and the gear out). Closing is always allowed.
- **Engage:** refused below the oil permissive pressure ([ADR 0050](0050-lube-oil-pressure-permissive-and-trip.md)) or with the rotor above `StandstillRpm` (20 rpm). So it engages at standstill, or on a coast-down once the rotor has slowed to it. Disengaging is always allowed.
- **Rotor:** `TurningGearTick` runs after `TurbineTick` and holds the rotor at gear speed as a floor (`max(rpm, gear rpm)`): the gear never drives it faster, and there is no start-up lag (3 rpm has no meaningful inertia to model).
- **Disengage:** a rotor at or below gear speed stops at once (rpm 0, as the stopped rotor reads today): the loss torque of the speed model is ∝ rpm², so left alone the rotor would coast at 3 rpm for hours. A faster rotor keeps its speed.
- **Low oil:** the gear drops out (disengages) when the header pressure falls below `PermissivePressure`, the same limit it needs to engage: the real gear motor is interlocked on oil. It must be engaged again by hand.
- **Gland steam:** `turningGearEngaged` is part of the "rotor turns" signal that [ADR 0047](0047-gland-seal-steam-sets-the-air-in-leakage.md) reads (#147); the roll that follows the disengage keeps the gland steam because the main steam valve is open.

## Considered options

- **An overrunning clutch** that throws the gear out on steam torque (some units): rejected for the first cut. The gear is engaged by hand and the valve refuses to open on it. The variant stays open for the prewarming ticket ([ADR 0048](0048-from-roll-on-demand-to-a-real-cold-start-in-milestones.md) open question 2: it is the only way prewarm steam can roll the rotor off the gear).
- **Gear speed as a first-order lag** from standstill: rejected, no source for the time and nothing depends on it.
- **The gear in `OilState`:** rejected. It is a turbine part that needs oil, as the valve does.

## Consequences

- `TurbineState` gains `turningGearEngaged` (cold plant: `false`); snapshots regenerated for the new field.
- Every scenario that rolls the turbine starts with the gear out, so none changed. `turning-gear` (edge) shows the refusal, the engage and the disengage.
- The gear motor is no electrical load yet (it moves onto the auxiliary bus with #141). The app has no gear switch: that is the follow-up `ui` ticket, with the gear and vacuum readout in the turbine start-up board. The coast-down onto the gear is the shutdown scenario (#38). Hot-restart wait and rotor bow need metal temperature (M3).
