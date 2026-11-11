# Feedwater loop

The closed water loop as built: boiler → main steam valve → bypass (or turbine) → condenser → hotwell → condensation pump → deaerator → boiler feed pump → heater → economizer → boiler. Why it is shaped this way: [ADR 0002](../adr/0002-makeup-into-hotwell.md). How real plants run it, with sources: [research/2026-10-feedwater-loop.md](../research/2026-10-feedwater-loop.md).

## Boundary flows

Water enters or leaves the loop in only four places. Everything else must conserve water.

| Flow | Where | Totalizer |
|---|---|---|
| Makeup | into the hotwell from storage | `makeupTotal` |
| Reject | out of the hotwell to storage | `rejectTotal` |
| Drain | out of the boiler | `drainedTotal` |
| Vent | steam out of the boiler to the atmosphere through the relief valve ([boiler.md](boiler.md#relief-valve)) | `ventedTotal` (kg) |

The deaerator ([deaerator.md](deaerator.md)) holds water but is neither a boundary nor a source: its mass is part of the plant's water, so the invariant sums it with the boiler and the hotwell. The sim models no leaks or continuous blowdown, so any other change in total water is a model error. The deaerator's operating vent is a continuous vent loss of about 0.08 kg/s ([deaerator.md](deaerator.md#air-vents-and-relief-adr-0038-120)), so **a settled plant needs a steady trickle of makeup** (the valve hovers near 0.2% open at the lower edge of the hotwell band); `makeupTotal` rising in `turbine-sync` and `turbine-load` is this, not a leak. The water invariant in `sim/invariants.ts` sums kg and allows only floating-point rounding (1e-12 of the start mass, see [headless-runner.md](../dev/headless-runner.md#water-drift)).

## Return and capacity

Two pumps move the water, each a flow actuator with no head ([ADR 0030](../adr/0030-return-pays-real-enthalpy.md)) and its own valve position × the 300 L/s `CondensationPump_MaxFlowRate`, converted from litres to kg at the temperature of the water it takes:

| | Condensation pump | Boiler feed pump (#112) |
|---|---|---|
| Takes from | hotwell | deaerator |
| Delivers to | deaerator (the **Return**) | boiler, through the heater and the economizer |
| Held level | deaerator level | drum level |
| Limited by | the hotwell water after makeup and reject, and the room in the deaerator | the water in the deaerator, and the room in the boiler |
| Trip | hotwell low-low (10%) | deaerator low-low (12%) |

The condensation pump never delivers more than the room in the deaerator: (capacity minus its volume) ÷ the specific volume at its temperature, in kg, less the extraction steam, the deaerator tap steam and the let-down steam that join the water in the same tick. The feed pump never delivers more than the room in the boiler: (capacity minus its volume) ÷ the specific volume at the boiler temperature, so a filling boiler stops at its 100 000 L total volume. What cannot be moved stays where it is: a full boiler stops the feed pump, the deaerator then fills and stops the Return, and the water stays in the hotwell. There is no overflow and no automatic reject ([ADR 0004](../adr/0004-return-stops-at-full-boiler.md)). The deaerator holds the water between the two, so a pump's change reaches the boiler a vessel later: the condensation pump follows the feed pump through the deaerator level ([deaerator.md](deaerator.md#boiler-feed-pump-112)). Steady, the feed pump flow is the condensation pump flow plus the heating steam and the heater drain. Water is held as kg and volumes are derived from the temperature-dependent specific volume ([ADR 0007](../adr/0007-water-state-is-mass-in-kg.md)); makeup and reject are valve flows in L/s, converted to kg at the hotwell temperature, and the totalizers count kg.

## Extraction heater (#88)

The feedwater leaves the deaerator and passes the extraction heater before the economizer ([turbine.md](turbine.md#extraction-heater-88), [ADR 0031](../adr/0031-one-extraction-heater.md)). Steam taken from the turbine at the tap heats it and condenses; the **heater drain cascades back into the deaerator** ([ADR 0036](../adr/0036-deaerator-is-a-steam-heated-tank.md)), so its heat replaces some heating steam there, and the heater holds none (no vessel, no level). The boiler receives the feed pump delivery in the same tick, heated by the heater, and the water the condenser receives is the turbine steam less the extraction steam of the heater and of the deaerator tap: the loop still conserves water. The extractions follow the last tick's flows (the heater the deaerator outflow, the tap the deaerator demand), so the room in the deaerator is reduced by them before the condensation pump fills it. With the turbine stopped there is no extraction: the let-down valve heats the deaerator from the boiler and the feedwater reaches the economizer at the deaerator temperature.

## Level targets

These are our own scaling to the simulator, agreed on #19, not sourced values.

| Boiler (capacity 100 000 L) | Level |
|---|---|
| Cold start | 35% (35 000 L), thermal expansion brings it to the target at 165 bar ([ADR 0018](../adr/0018-cold-fill-at-35-percent.md)) |
| Target | 50% (50 000 L) |
| Control band | ±5% |
| Alarm | ±12% (not in code) |
| Trip | below 30%, above 70% (not in code) |

| Boiler pressure | Value |
|---|---|
| Operating pressure | 165 bar (below the 180 bar design pressure) |
| Control band | ±2 bar |

| Hotwell (capacity 50 000 L) | Level | Where |
|---|---|---|
| Overfill clamp (`HotwellHighHigh`) | from 95% | plant: `CondenserTick` forces the reject fully open |
| Reject fully open | 90% (band edge + `HotwellRamp`) | operator |
| Working band | 55% to 75%; normal and start level 70% | operator: both valves shut |
| Makeup fully open | 40% (band edge − `HotwellRamp`) | operator |
| Low-low (`HotwellLowLow`) | below 10% | plant: `CondenserTick` trips the condensation pump |

Levels are volume fractions (`hotwellWaterVolume` / `TotalVolume`), so they drift with the hotwell temperature ([ADR 0007](../adr/0007-water-state-is-mass-in-kg.md)). The two protections are plant behaviour and the band is operator policy ([ADR 0011](../adr/0011-hotwell-protections-in-the-tick.md)).

**Low-low trip.** Below 10% the pump valve is shut, `condensationPumpTripped` is set and nothing is returned. Opening the pump is refused while the level is below 10%; closing is always allowed. The flag clears on the next successful opening, so after a trip the pump stays shut until the operator opens it.

**Overfill clamp.** From 95% the reject flows as if fully open, whatever the operator set. The stored valve position is not changed, so nothing latches.

## Control

Real plants hold drum level and hotwell level with automatic control loops. In the sim the operator does this by hand. In scenarios a per-tick operator hook plays that role: `sim/scenarios/loop-operator.ts` (settings in `LoopSettings`). It:

- above main-steam-valve pressure (10 bar): restarts the SJAE at 100% (motive steam from boiler pressure, main steam valve still shut)
- at working pressure (163 bar, `atWorkingPressure`): opens the main steam valve, sets the bypass to a fixed 10% (20 kg/s, close to the ~18 kg/s the turbine needs for 3000 rpm at 165 bar), the condensation pump to 10% and the feed pump to 10% (`FeedPumpOpening`), and starts the boiler and deaerator level holds. The valve stays shut during heat-up: the water expands from 35% to 50% on its own, and holding 50% from 10 bar on would feed the boiler back up and reject about 4 t anyway (ADR 0018)
- holds the working pressure with gas (`holdPressureWithGas` in `sim/scenarios/pressure-hold.ts`, shared with `turbine-runup`; settings in `PressureHoldSettings`): 165 ± 2 bar, above the band it lowers gas 10 L/s per second and below it raises gas, inside the band it moves only against the pressure trend (`Boiler.heatingRate`: pressure follows saturation). Gas never goes above `StartGas` and never below 100 L/s, the burner's minimum firing rate. The bypass stays at 10%
- feedwater control (#74, #112): sets the **feed pump** valve to all the steam leaving the boiler (turbine, bypass and let-down flow, in litres at the deaerator temperature, over the pump's 300 L/s) plus `LevelGain` (1) times the drum level error. The feed costs heat, so a bang-bang level hold swung the pump between shut and a third open and the pressure with it (110 to 208 bar in `turbine-load`); the feedforward keeps the feed equal to the steam and the level only trims it. The extraction steam of the heater and the tap is no longer subtracted: it returns to the deaerator, and the feed pump has to deliver what the boiler gave up
- deaerator level (#112): sets the **condensation pump** valve by plain level feedback, no feedforward from the feed pump flow: each second it moves by `DeaeratorLevelGain` (2) × the error to `DeaeratorLevelTarget` (50%) less `DeaeratorLevelDamping` (60) × the level rate (`Deaerator.deltaWaterMass`), so it integrates to the flow the feed pump takes and the vessel, an integrator itself, does not oscillate. Measured on `turbine-load` (125 MW) the deaerator level stays at 50.0%, and in `max-output` (load past rated, then the breaker opens) it swings 49.9 to 50.6%, never near the 12% low-low, so no feedforward ticket is needed
- nudges the cooling water valve against the condenser pressure (`CondenserPressureHigh` 33 mbar: more; `CondenserPressureLow` 28 mbar: less), never below `CoolingWaterMinimum` (10%) so a surge of steam finds the exchanger running; the cooling water opens to `CoolingWaterOpening` (10%) with the main steam valve
- opens makeup or reject in proportion to the distance outside the 55–75% working band (`hotwellValvePositions`: zero inside, fully open `HotwellRamp` = 15 points beyond the edge), a pure function of the level

`turbine-runup` opens the main steam valve at 34 bar (780 s) but starts the boiler level hold only at working pressure, like the loop operator: the boiler is at about 42% then, under the 45% band edge, but already holds the right mass, so the hold would feed about 15 t of cold hotwell water into a boiler that is not short of water (#79, ADR 0018). Until then the condensation pump and the feed pump stay at their 0.05 start positions and nothing is made up or rejected.

The `bypass-loop` scenario heats with the gas knob fully up (full gas after 40 s, #15) and the main steam valve shut, backs the gas off to `StartGas` from 120 bar on (the gas needs about 33 s to come back, and the pressure rises 1 bar/s) and reaches the operating pressure at about 280 s (#65, was 220 s with the gas jumping; 2040 s before that, when the main steam valve opened at 10 bar and the 50% cold fill had to be rejected on the way up), where the operator opens the main steam valve and gas takes over. The boiler is at 51% level at that moment with nothing fed or rejected during heat-up. The pressure peaks at 166.7 bar, because the gas is already back at the heat-up gas when the valve opens (it overshot to about 173 bar when the gas jumped down, #15), well below the 180 bar relief setpoint (#9), and stays within 165 ± 0.3 bar after about 600 s; the run still lasts 7200 s and the last 600 s are judged: pressure and boiler level stay in their bands, the relief valve never lifts, and steam out matches steam generated within 5% (about 20 kg/s, which takes about 600 L/s of gas). With the water held in kg (#34) the loop conserves water, and the condensate leaves at the saturation temperature of the condenser pressure (#35), so the hotwell settles near 30 °C. Over the whole run the hotwell stays between 64.7% and 70% of the 50 m³ (#53, #52), makeup and reject never open (before the 35% cold fill reject took 12.0 t, 10.2 t of it during heat-up), and the boiler level climbs from 51% to 54.6% as the loop settles; at 15 m³ with on/off hysteresis the level swung 53% to 99.96% and makeup took 57 t and reject 69 t in an hour. **Since the deaerator (#119)** the figures of this paragraph move: its warm-up draws about 12 t of let-down steam from the boiler, so the working band is reached later (about 1500 s, with the main steam valve opening at 520 s on a first pass at 163 bar and the pressure sagging back while the deaerator heats), the pressure peaks at 166.2 bar, the hotwell falls to 50.6% before the operator tops it up (makeup 5.3 t in the run, reject none), and the run ends with the boiler at 50.0% and the pressure within 165 ± 0.2 bar. Steam out of the boiler now counts the let-down steam.
