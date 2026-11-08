# The turbine speed PID takes its derivative on the measurement

The derivative term acted on the rpm error and kept `pidPreviousError` in the turbine state. On the first tick after hold mode (or the main steam valve) came on, the previous error was 0 or stale, so a 3000 rpm error gave `Kd · 3000 / 0.1 = 15` and slammed the valve open in one tick. Decided in #25.

D is now `−Kd · (rpm_now − rpm_previous) / dt`, with the previous rpm being `turbineState.rpm` (the value before the tick). `pidPreviousError` is gone from `TurbineState`, the initial state and the trip. While the PID is inactive (Free mode or main steam valve closed, [ADR 0021](0021-turbine-runup-from-steam-power.md)) `pidIntegralError` is returned as 0, so every engage starts with a zero integral.

## Considered options

- **Seed `pidPreviousError` with the current error when hold mode toggles:** fixes the toggle only; re-opening the main steam valve with hold mode on would still kick, and it adds controller memory that can go stale.
- **Derivative on measurement, integral reset while inactive (chosen):** no memory for D, so nothing can be stale, and the same rule covers both ways the PID (re)starts. Standard practice for a speed governor; a setpoint change no longer kicks D either.

## Consequences

- The first tick of a (re)engaged PID moves the valve by P, a zero-start I and the damping of that tick's rpm change only.
- Kp, Ki and Kd are unchanged; steady-state hold behaviour is the same.
- `calculateValveAdjustment` takes the previous rpm instead of the previous error and no longer returns `newPreviousError`.
