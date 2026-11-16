# Turning gear: holds the stopped rotor and throws itself out when steam rolls it

**Status: accepted, amended.** Decided in #146, M1 of [ADR 0048](0048-from-roll-on-demand-to-a-real-cold-start-in-milestones.md). #146 built a manual gear that blocks the turbine valve; the owner then chose an **overrunning gear** (below), as on most utility turbines. The owner builds the change and scopes it in #147. Until it lands, the code still refuses the turbine valve on gear, and the reference docs ([turbine.md](../plant/turbine.md), [overview.md](../plant/overview.md), `GLOSSARY.md`, [headless-runner.md](../dev/headless-runner.md)) describe the manual gear as built.

The turbine has a **turning gear**, an operator switch (`SET_TURNING_GEAR`, state `Turbine.turningGearEngaged`). Engaged, it turns the stopped rotor at `CstTurningGear.Rpm` (3 rpm). The figures are UNVERIFIED, see [research/2026-11-turning-gear.md](../research/2026-11-turning-gear.md) and [design-basis.md](../plant/design-basis.md).

- **Overrunning gear, rolled off by steam:** the turbine valve may open with the gear engaged. The operator does not disengage the gear before rolling. When the steam drives the rotor faster than the gear speed, the gear throws itself out (`turningGearEngaged` becomes `false`) and its motor stops. On a real unit this is the gear's own overrunning drive (a helical pinion that the reversed tooth thrust slides out of mesh, or an overrunning clutch), not the overspeed trip. UNVERIFIED: general engineering practice, no source read yet.
- **Roll permissive:** oil pressure at the permissive only ([ADR 0050](0050-lube-oil-pressure-permissive-and-trip.md)). The gear no longer blocks the operator's valve opening or the Ramp up / Hold PID. Closing is always allowed.
- **Engage:** by the operator, refused below the oil permissive pressure or with the rotor above `StandstillRpm` (20 rpm). So it engages at standstill, or on a coast-down once the rotor has slowed to it. Disengaging by hand stays allowed.
- **Rotor:** `TurningGearTick` runs after `TurbineTick`. While the rotor is at or below gear speed, the gear holds it at gear speed as a floor (`max(rpm, gear rpm)`). When `TurbineTick` has driven the rotor above gear speed, the gear throws out and the rotor keeps its speed. There is no start-up lag (3 rpm has no meaningful inertia to model).
- **Disengage by hand:** a rotor at or below gear speed stops at once (rpm 0, as the stopped rotor reads today): the loss torque of the speed model is ∝ rpm², so left alone the rotor would coast at 3 rpm for hours. A faster rotor keeps its speed.
- **Low oil:** the gear drops out (disengages) when the header pressure falls below `PermissivePressure`, the same limit it needs to engage: the real gear motor is interlocked on oil. It must be engaged again by hand.
- **Gland steam:** `turningGearEngaged` is the "rotor turns" signal that [ADR 0047](0047-gland-seal-steam-sets-the-air-in-leakage.md) reads (#147), together with rpm above gear speed after the roll-off.
- **Prewarming:** too much prewarming steam rolls the rotor off the gear (M3, [ADR 0048](0048-from-roll-on-demand-to-a-real-cold-start-in-milestones.md) open question 2, now settled).

## Considered options

- **A manually engaged gear that blocks the turbine valve** (built in #146): rejected afterwards. It is marine and small-turbine practice, where an interlock blocks steam while the gear is in. On a utility unit nobody disengages the gear before rolling, and the manual gear makes the prewarm roll-off impossible.
- **Hydraulic turning** (an oil jet driving a wheel on the shaft, on some units): rejected. There is no gear to engage or throw out, so no operator step to show.
- **Automatic engage on the coast-down** (real plants re-engage the gear near zero speed with oil and jacking oil available): not built now. There is no shutdown scenario (#38 closed); the operator engages at standstill. A follow-up when the coast-down matters.
- **Gear speed as a first-order lag** from standstill: rejected, no source for the time and nothing depends on it.
- **The gear in `OilState`:** rejected. It is a turbine part that needs oil, as the valve does.

## Consequences

- `TurbineState` has `turningGearEngaged` (cold plant: `false`).
- With the change: the gear refusal in the turbine valve reducer and the gear term of `TurbineTick`'s roll permissive go; `TurningGearTick` throws the gear out above gear speed. The `turning-gear` edge scenario changes from "valve refused on gear, disengage, roll" to "valve opens on gear, the rotor rolls off and the gear throws out". Every scenario that rolls the turbine starts with the gear out, so none of them changes.
- The reference docs listed in the status line, and `GLOSSARY.md` (Turning gear, Roll-off), are updated in the commit that builds it.
- The board (#163) shows the gear thrown out on the roll-off instead of a valve refused on gear. The start-up order (#148) has no disengage step.
- The gear motor is no electrical load yet (it moves onto the auxiliary bus with #141). Hot-restart wait and rotor bow need metal temperature (M3).
