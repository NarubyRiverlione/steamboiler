# Feedwater loop

The closed water loop as built: boiler → main steam valve → bypass (or turbine) → condenser → hotwell → condensation pump → boiler. Why it is shaped this way: [ADR 0002](../adr/0002-makeup-into-hotwell.md). How real plants run it, with sources: [research/2026-10-feedwater-loop.md](../research/2026-10-feedwater-loop.md).

## Boundary flows

Water enters or leaves the loop in only four places. Everything else must conserve water.

| Flow | Where | Totalizer |
|---|---|---|
| Makeup | into the hotwell from storage | `makeupTotal` |
| Reject | out of the hotwell to storage | `rejectTotal` |
| Drain | out of the boiler | `drainedTotal` |
| Vent | steam out of the boiler to the atmosphere through the relief valve ([boiler.md](boiler.md#relief-valve)) | `ventedTotal` (kg) |

The sim models no leaks or continuous blowdown, so any other change in total water is a model error. The water invariant in `sim/invariants.ts` sums kg and allows only floating-point rounding (1e-12 of the start mass, see [headless-runner.md](../dev/headless-runner.md#water-drift)).

## Return and capacity

The condensation pump moves hotwell water into the boiler as the **Return**: the pump flow (valve position × `CondensationPump_MaxFlowRate` × tick, litres, converted to kg at the hotwell temperature), but never more than the hotwell holds after makeup and reject, and never more than the boiler has room for: (capacity minus its volume) ÷ the specific volume at the boiler temperature, in kg, so a filling boiler stops at its 100 000 L total volume. What cannot be returned stays in the hotwell. The boiler takes the Return in the same tick the hotwell gives it. A full boiler simply stops taking water; there is no overflow and no automatic reject ([ADR 0004](../adr/0004-return-stops-at-full-boiler.md)). Water is held as kg and volumes are derived from the temperature-dependent specific volume ([ADR 0007](../adr/0007-water-state-is-mass-in-kg.md)); makeup and reject are valve flows in L/s, converted to kg at the hotwell temperature, and the totalizers count kg.

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

- above main-steam-valve pressure (10 bar): brings gas down once to the heat-up gas (`StartGas`, 2000 L/s), opens the main steam valve, sets the bypass to a fixed 10% (20 kg/s, close to the ~18 kg/s the turbine needs for 3000 rpm at 165 bar) and the condensation pump to 10%, and restarts the SJAE at 100%
- holds the working pressure with gas (`holdPressureWithGas` in `sim/scenarios/pressure-hold.ts`, shared with `startup-cold`; settings in `PressureHoldSettings`): 165 ± 2 bar, above the band it lowers gas 10 L/s per second and below it raises gas, inside the band it moves only against the pressure trend (`Boiler.heatingRate`: pressure follows saturation). Gas never goes above `StartGas` and never below 100 L/s, the burner's minimum firing rate. The bypass stays at 10%
- nudges the condensation pump valve toward the boiler level target
- nudges cooling water against the steam mass in the condenser
- opens makeup or reject on the hotwell limits, with hysteresis

The `bypass-loop` scenario builds pressure at `StartGas` with the bypass at 10% (less steam leaves than is generated) and reaches the operating pressure (#12), where gas takes over. The pressure overshoots to about 176 bar, below the 180 bar relief setpoint (#9), and settles at 165 ± 0.1 bar after about 6600 s, so the run lasts 7200 s and the last 600 s are judged: pressure and boiler level stay in their bands, the relief valve never lifts, and steam out matches steam generated within 5% (about 20 kg/s, which takes about 600 L/s of gas). With the water held in kg (#34) the loop conserves water, and the condensate leaves at the saturation temperature of the condenser pressure (#35), so the hotwell settles near 30 °C. In that window makeup and reject are open less than 10% of the time, so those assertions pass; the hotwell thresholds and volume stay open under #52 and #53.
