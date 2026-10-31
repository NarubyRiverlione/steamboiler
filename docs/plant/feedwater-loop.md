# Feedwater loop

The closed water loop as built: boiler → main steam valve → bypass (or turbine) → condenser → hotwell → condensation pump → boiler. Why it is shaped this way: [ADR 0002](../adr/0002-makeup-into-hotwell.md). How real plants run it, with sources: [research/2026-10-feedwater-loop.md](../research/2026-10-feedwater-loop.md).

## Boundary flows

Water enters or leaves the loop in only three places. Everything else must conserve water.

| Flow | Where | Totalizer |
|---|---|---|
| Makeup | into the hotwell from storage | `makeupTotal` |
| Reject | out of the hotwell to storage | `rejectTotal` |
| Drain | out of the boiler | `drainedTotal` |

The sim models no leaks, vents or blowdown, so any other change in total water is a model error. The water invariant in `sim/invariants.ts` allows 0.1% of the start mass.

## Return and capacity

The condensation pump moves hotwell water into the boiler as the **Return**: the pump volume (valve position × `CondensationPump_MaxFlowRate` × tick), but never more than the hotwell holds after makeup and reject, and never more than the boiler has room for (capacity minus its water), so the boiler never passes its 100 000 L total volume. What cannot be returned stays in the hotwell. The boiler takes the Return in the same tick the hotwell gives it. A full boiler simply stops taking water; there is no overflow and no automatic reject ([ADR 0004](../adr/0004-return-stops-at-full-boiler.md)). Volumes count 1 L = 1 kg; temperature-dependent density is #34.

## Level targets

These are our own scaling to the simulator, agreed on #19, not sourced values.

| Boiler (capacity 100 000 L) | Level |
|---|---|
| Target | 50% (50 000 L) |
| Control band | ±5% |
| Alarm | ±12% (not in code) |
| Trip | below 30%, above 70% (not in code) |

| Boiler pressure | Value |
|---|---|
| Operating pressure | 165 bar (below the 180 bar design pressure) |
| Control band | ±2 bar |

| Hotwell (capacity 15 000 L) | Level |
|---|---|
| Target | 70% |
| Makeup opens | below 65% |
| Reject opens | above 75% |

## Control

Real plants hold drum level and hotwell level with automatic control loops. In the sim the operator does this by hand. In scenarios a per-tick operator hook plays that role: `sim/scenarios/loop-operator.ts` (settings in `LoopSettings`). It:

- above main-steam-valve pressure (10 bar): brings gas down to 5000 L/s, opens the main steam valve, sets the bypass to 5% and the condensation pump to 10%, and restarts the SJAE at 100%
- nudges the bypass toward the operating pressure, never below its 5% start opening (a plain dead band: the state carries no pressure trend)
- nudges the condensation pump valve toward the boiler level target
- nudges cooling water against the steam mass in the condenser
- opens makeup or reject on the hotwell limits, with hysteresis

The `bypass-loop` scenario cannot reach the operating pressure yet: above about 100 bar the boiler model heats water past saturation, stops making steam and runs to NaN even with the bypass fully open (#22, #12, with no relief valve until #9). Its pressure and level assertions are expected failures until then; the scenario verifies those fixes.
