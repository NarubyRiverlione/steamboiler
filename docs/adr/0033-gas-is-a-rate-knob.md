# The gas is set by a latching rate knob

The operator turns one latching **gas rate knob** instead of pressing step buttons. The knob position is a rate command from -1 to 1 (`BoilerState.gasRateCommand`): centre holds, right raises, left lowers. Deflection sets the speed with a dead zone of 5% and a quadratic taper, up to `GasRateMax` (300 L/s per second, 0 to full gas in 40 s) at full deflection. Gas flow is the integral of the command, stepped in `BoilerTick` in simulated seconds and clamped to 0 to `MaxGasFlow`. The gas never jumps within a tick, in the app and in every scenario. Decided in #15; the scale of `MaxGasFlow` is unchanged ([design-basis.md](../plant/design-basis.md), #13).

## Considered options

- **Larger steps or presets:** rejected. Presets jump the gas, and the startup pace comes from the operator ramping the gas against the heating-rate limit ([ADR 0006](0006-heating-rate-alarm-only.md)), which needs small and large moves from the same control.
- **A slider or an absolute-range knob (the mockup of [ADR 0015](0015-ui-redo-analog-board-preferred.md)):** rejected. It sets a gas value, so a drag jumps the gas by thousands of litres in one tick, and the plant would need a second, hidden slew limit to hide that. A rate knob has the limit in the control: its maximum rate is the limit, and there is no separate burner slew limit.
- **A spring-return rate stick:** rejected. A knob that stays where it is lets the operator walk away from a raising gas, so a forgotten knob must be visible (a RISING or FALLING indicator) and the burner trip centres it. Latching also keeps the keyboard and scroll input simple.
- **Keep `INCREASE_GAS_FLOW` and `DECREASE_GAS_FLOW` for scenarios:** rejected. Two gas paths mean the scenarios judge a plant the operator cannot run. The actions are removed and every scenario turns the knob (`sim/scenarios/gas.ts`), so the sim has one gas path.
- **One `Knob` component per use:** rejected. `Knob` gets a `mode` (`absolute` for the valve knobs, turned since #41, `centre-zero` for the gas knob) so the two share the sweep and the cap, and shape tells them apart: a bold detent at 12 o'clock that lights at zero rate, a bipolar arc, ticks denser towards the ends, `LOWER`, `HOLD` and `RAISE` labels and its own cap tint, not red and not a lamp colour. Colour only reinforces it.

## Consequences

- A burner trip ([ADR 0017](0017-burner-trips-on-low-water-level.md)) forces the gas to 0 and the knob to centre. Restart is a deliberate turn: a deflection past the dead zone to the raise side while the water is at or above `BurnerLowLowLevel` clears `burnerTripped` and the gas ramps up from 0; below that level the command is refused.
- A scenario cannot set a gas value. An operator that wants a gas steers the knob (`steerGas`) and one that must reach full or zero gas turns the knob fully and lets the clamp stop it. The gas takes time to come back from full (about 33 s from 12 000 to 2000 L/s while the pressure rises about 1 bar/s), so an operator that wants a pressure must start early: the `bypass-loop` operator backs the gas off from 120 bar.
- `GasRateMax`, the dead zone and the 300 L/s per second rate are UNVERIFIED playability numbers, recorded in [design-basis.md](../plant/design-basis.md). They tune the control, not the startup pace.
- The golden snapshots changed and `heat-up` (962 s before) is 964 s now: the final gas cut ramps down over about 7 s (it is 21 595 s since #103 restored the real heating-rate limit).
