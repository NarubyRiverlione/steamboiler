# Deaerator

The feedwater tank between the hotwell and the boiler, as built in #119: [ADR 0036](../adr/0036-deaerator-is-a-steam-heated-tank.md) (the steam-heated tank held at 3 bar) and [ADR 0037](../adr/0037-deaerator-cold-fill-at-38-percent.md) (the 38% cold fill), and in #120: [ADR 0038](../adr/0038-deaerator-air-and-vents.md) (the air, the two vents, the relief valve and the panel). The boiler feed pump is #112. Code: `src/context/Deaerator/DeaeratorTick.ts` (pure function), wired in `PowerPlantTick`; the air and vent physics in `src/utils/deaeratorCalculations.ts`; constants in `CstDeaerator`; the page in `src/components/Deaerator/Deaerator.tsx` ([ui-board.md](../dev/ui-board.md)).

## Path

hotwell → condensation pump → **deaerator** → feed pump → heater → economizer → boiler. The heater stays in series after the deaerator; its drain cascades back into the deaerator ([turbine.md](turbine.md#extraction-heater-88)).

## The vessel

One lumped tank, perfectly mixed (ADR 0019 style): water mass in kg, one temperature, the volume derived from the mass at that temperature ([ADR 0007](../adr/0007-water-state-is-mass-in-kg.md)). The pressure is the air pressure plus the saturation pressure of the water (below). Total volume `TotalVolume` 150 m³.

| State (`Deaerator`) | Meaning |
|---|---|
| `waterMass`, `waterVolume` | the water held (kg, litres) |
| `temperature`, `pressure` | °C and bar: the total pressure, air plus saturation; the setpoint is 3 bar of saturation (133.5 °C) |
| `saturationPressure`, `airMass`, `airPressure` | bar of the water temperature, kg of air, and its partial pressure (derived) |
| `startUpVentOpen`, `reliefValveOpen` | the operator's start-up vent and the 4 bar relief valve |
| `ventedTotal` | kg of steam the vents and the relief let out since start (a boundary flow of the water balance, in `loopWater`) |
| `safeToClose`, `warnVentClosedWithAir`, `warnVentOpenNoAir` | the lamp and the two warning flags |
| `extractionFlow`, `extractionValvePosition` | kg/s taken at the turbine tap, and the share of the valve capacity it is |
| `letDownFlow`, `letDownValvePosition` | kg/s taken from the boiler through the let-down valve, and the share of its capacity |
| `tapDemand` | kg/s the pressure loop asks of the tap for the next tick |
| `outflowMass` | kg the feed pump delivered toward the boiler over the last tick |
| `feedPumpValvePosition`, `feedPumpTripped` | the boiler feed pump: valve position 0-1, and the low-low trip flag (the boiler's high-high trip has its own flag, `Boiler.boilerLevelHighTripped`) |
| `deltaWaterMass` | kg change of the vessel over the last tick, the level trend |

## Pressure control: one loop, split range

Each tick the heat needed to bring the stored water and everything that enters (Return, heater drain) to the 3 bar setpoint is the **demand**. Steam supplies it, tap first, boiler for the rest:

- **Extraction valve (tap):** the tap of [ADR 0031](../adr/0031-one-extraction-heater.md) passes steam only while the heater-line pressure at the tap is above the setpoint (the non-return valve: no flow back into the turbine). Flow grows with the pressure margin, fully open at `ExtractionOpeningRange` (50%) of the setpoint above it, so there is no step when the tap crosses 3 bar. It is limited to the turbine flow the heater leaves, to the valve capacity `ExtractionValveCapacity` (60 kg/s) and to the demand of the **last tick**: the condenser runs after the exhaust flow is known, so the tap steam is fixed before it (a lag of 0.1 s, like the heater).
- **Let-down valve (auxiliary line):** boiler steam through a pressure-reducing valve, for what the tap did not give (turbine closed, tripped, low load, cold start). Its capacity `LetDownCapacity` (50 kg/s) scales with the boiler pressure like the steam valves ([ADR 0026](../adr/0026-valve-flow-follows-pressure.md)), and it passes nothing while the boiler pressure is at or below the deaerator pressure: the pressure needed at start-up falls out of the physics. It is shut while the burner low-low trip holds (a tripped boiler gives no steam away; the trip latches, so the valve does not chatter). The bypass does not feed the deaerator.
- The steam of both valves mixes into the water at its own enthalpy (tap: the tap enthalpy; let-down: saturated vapour at the boiler pressure, throttled at constant enthalpy). It never cools the water: with nothing to heat the demand is zero and the temperature may drift above the setpoint (a hot drain with no Return).

## Boiler feed pump (#112)

hotwell → condensation pump → **deaerator** → feed pump → heater → economizer → boiler. All the steam condenses into the tank; the **boiler feed pump** takes the water out at its valve position (`feedPumpValvePosition` × `CondensationPump_MaxFlowRate` 300 L/s × tick, litres converted to kg at the water temperature) and delivers it to the boiler, after the heater has heated it ([feedwater-loop.md](feedwater-loop.md#return-and-capacity)). It is limited by the water held and by the room in the boiler: a full boiler stops it ([ADR 0004](../adr/0004-return-stops-at-full-boiler.md)). Like the condensation pump it is a flow actuator, with no head (ADR 0030); the rated 192 kg/s is about 206 L/s at 134 °C, 69% of the valve, so no new capacity.

- **Trip:** below `LowLowLevel` (12% of the volume, [design-basis.md](design-basis.md)) the valve is shut and `feedPumpTripped` set; nothing is delivered. Opening is refused (`SET_FEED_PUMP_VALVE_POSITION`) while the level is below it and while the flag is set, closing is always allowed, and only the trip reset (`RESET_TRIP`, `feedPump`, allowed once the level is at or above low-low, a RESET beside the trip lamp, [ADR 0043](../adr/0043-trip-reset.md)) clears the flag, as for the hotwell ([ADR 0011](../adr/0011-hotwell-protections-in-the-tick.md)). The pump also trips from 70% of the boiler volume ([boiler.md](boiler.md#high-high-level-trip), [ADR 0041](../adr/0041-boiler-high-high-level-trips-feed-pump-and-turbine.md)): `PowerPlantTick` shuts the valve before this tick's delivery and the reducer refuses to open it there.
- **Levels:** the feed pump holds the **drum** level, the condensation pump holds the **deaerator** level. Steady, the feed pump flow is the condensation pump flow plus the heating steam (tap and let-down) and the heater drain; the vessel absorbs the difference in a transient.
- **Condensation pump limit:** the Return stops at a full deaerator, so a full boiler backs up through the deaerator into the hotwell. The room is the vessel volume less the water at its temperature, less the steam and drain that join in the same tick.
- **Control:** in the scenarios the loop operator holds both levels ([feedwater-loop.md](feedwater-loop.md#control)): the feed pump by the steam leaving the boiler plus `LevelGain` × the drum level error, the condensation pump by plain level feedback on the deaerator level (no feedforward from the feed pump flow). The page has the feed pump control and its trip lamp; the overview schemas show the deaerator, feed pump, auxiliary line, let-down valve, extraction non-return valve and heater drain cascade (#118, [overview.md](overview.md#schema)).

## Air, vents and relief (ADR 0038, #120)

**Air.** One tracked mass of air (`airMass`, kg) in the gas space above the water (`TotalVolume` less the water volume). Its partial pressure is `m·R·T/V` at the water temperature, and the total pressure is that plus the saturation pressure of the water (`saturationPressureOf`: Antoine below 80 °C, the steam table above). The cold vessel is full of air at atmospheric pressure: 109 kg, 0.99 bar of air over 0.023 bar of vapour. The steam control of #119 does not change: it asks for the heat that brings the water to the 3 bar saturation temperature (133.5 °C), so air shows up as a higher total pressure (about 4.7 bar when all 109 kg stay), not as a throttled valve. The let-down valve chokes on the actual vessel pressure and the tap's non-return valve opens on the margin over the greater of the setpoint and the vessel pressure, so air slows the steam where the source pressure is low (cold start).

**Vents.** Both pass the gas mixture (air and steam in their mass shares) to the atmosphere through an orifice, `A·√(2·ρ·ΔP)` with ΔP the vessel pressure over atmospheric, so a vent passes nothing at or below atmospheric. The **start-up vent** is the operator's open/close action (`TOGGLE_DEAERATOR_VENT`, effective area `StartUpVentArea` 0.06 m²); the **operating vent** is a small fixed orifice that is always open and not drawn (`OperatingVentArea` 0.0001 m², about 0.08 kg/s of steam at 3 bar, 0.04% of the rated feedwater). Vent steam leaves the mixed water as saturated vapour: the mass leaves the water balance (`ventedTotal`) and the water cools by its latent heat. The air share leaves `airMass`. The loop makes the steam up as makeup ([ADR 0002](../adr/0002-makeup-into-hotwell.md)); there is no read-out of the loss. **Steady makeup is therefore normal** (#120): the vent runs as long as the vessel is at pressure, and the sim has no air ingress, so once the start-up air is gone (about 0.01 kg after 30 min) it passes nearly pure steam. The hotwell sits at the 55% band edge and the makeup valve hovers at about 0.2% open to replace it: in `turbine-sync` and `turbine-load` the makeup over a run equals the vent loss (about 92 kg in 1190 s and 210 kg in 2990 s against 95 and 238 kg vented). Before #120 these runs needed no makeup. It is the same size as the real plant's operating vent loss, which a real plant also makes up (design-basis.md); a throttled vent that shrinks with the air left, or a vent condenser, are not built.

**Relief valve.** Full lift at `ReliefPressure` 4 bar, seats at `ReliefReseatPressure` 3.6 bar (10% blowdown), decided on the pressure at the start of the tick like the boiler's ([ADR 0005](../adr/0005-relief-valve-vents-to-atmosphere.md)). While lifted it passes `ReliefCapacity` 120 kg/s of mixture at 4 bar (110% of the 60 + 50 kg/s the two steam valves pass), in proportion to the pressure. It loses steam and air and does no damage.

**Lamp and flags.** The safe-to-close lamp lights when the air partial pressure is under `SafeToClosePressure` 0.05 bar (5% of the cold air); a lit lamp holds until `SafeToCloseRelease` 0.075 bar, because the air pressure of a closed vessel rises with its temperature and the lamp must not flicker at the close. The two flags: `warnVentClosedWithAir` (vent closed and the lamp not lit) and `warnVentOpenNoAir` (vent open and the lamp lit). The yellow annunciator tile is #115 and #116.

### Measured (headless runner, `pnpm sim`)

| Cold start | Result |
|---|---|
| Vent opened at t=0 and closed when the lamp lights (`bypass-loop`, `turbine-runup`, `relief-lift` via `startUpVent`) | `bypass-loop`: the lamp lights at 390 s (the air at 3.8 kg, 0.05 bar, the water at 103 °C), the operator closes the vent, the vessel is at 133.5 °C and 3.06 bar at 490 s with about 3.5 kg of air left, which the operating vent clears slowly (3.05 bar at 600 s). About 110 kg of steam is lost while the vent is open and 0.08 kg/s after it. No relief lift. `turbine-runup`: lamp at 1240 s, hot at 1460 s |
| Never opened (`deaerator-vent-closed`) | the pressure runs ahead of the saturation by the air (2.1 bar at 93 °C against 0.8 of saturation), reaches 4 bar at about 475 s and the relief valve lifts once, losing about 90 kg of steam and more than half of the air (99 → 44 kg); the vessel is hot at 490 s with 0.7 bar of air, 3.7 bar total, and the lamp is still out after an hour (5.7 kg of air left) as only the operating vent clears the rest. No damage |
| Left open (`deaerator-vent-open`) | the air is out at 390 s and the flag is set from then on; steam leaves at up to 20 kg/s (6.2 t in all, from the boiler's let-down steam and the vessel's water), the vessel peaks at 123 °C, then the boiler (no Return in this run) loses the water and its burner trips on low level at 530 s, the let-down steam stops and the vessel falls back to 100.0 °C and 1.013 bar, where it stays; it never reaches 133.5 °C |

The loop invariants (water never created or lost, with `ventedTotal` as a boundary flow) hold in all three.


## Cold fill and start-up (ADR 0037)

The vessel starts at 38% of 150 m³ (57 m³) at ambient. Heating to 3 bar raises the level by about 31% of the volume (7% thermal expansion, about 22% more mass from condensed steam), measured in the headless runner: **38% cold → 50.1% hot** (`bypass-loop`, `turbine-runup`; 50.4% after the turbine runs). The hand estimate holds, so ADR 0037 is accepted. The warm-up takes about 12 t of steam from the boiler through the let-down valve, so it opens as soon as the boiler is above atmospheric; the deaerator is hot after about 8 min in `bypass-loop` (full gas, 490 s) and 24 min in `turbine-runup` (1460 s). That draw, about 28 GJ, delays the boiler pressure build: `bypass-loop` reaches the working band at about 1500 s (284 s before) and `turbine-runup` at about 1870 s (1234 s before).

## Heater and economizer

The heater takes the deaerator outflow as its feedwater (flow and temperature of the last tick for the extraction, the actual ones for the heating) and gives it to the economizer at about 150 °C at rated flow. The economizer and the flue gas balance ([ADR 0029](../adr/0029-boiler-efficiency-from-flue-gas-heat-balance.md)) take the temperature **after the heater**, which is what physically enters the economizer; below about 64% of the rated flow the heater is off and it is the deaerator temperature, 133.5 °C. With the turbine closed or tripped the let-down valve holds 3 bar (the `turbine-trip` edge scenario).

## Measured

`turbine-load`, 125 MW: steam 176 kg/s, deaerator tap 38 kg/s, heater 5 kg/s, tap 4.6 bar, feedwater 144 °C after the heater and 198 °C after the economizer, stack 229 °C, boiler 90.0%, plant 32.4% (33.2% with the heater alone in #88, the let-down steam at low load and the lower tap pressure cost about 0.8 points). The two extractions together take about the same share of the flow as the heater alone did (`ratedExtractionShare`), so the rated output is 141.9 MW (141.3 before) and `RatedSteamFlow` stays 192 kg/s (`max-output` still reads it within 3 kg/s).

## Level gauge zones

The level instrument draws red below `LowLowLevel` (12%) and from `HighHighLevel` (85%), orange from 12% up to `LowLevel` (25%) and from `HighLevel` (75%) up to 85%, green for `WorkingLow` to `WorkingHigh` (45-55%, both ends included) and no colour between (25-45% and 55-75%), built by the generic `levelZones` ([ui-board.md](../dev/ui-board.md#level-zones), #54). The 25% low alarm is 19.5 m³ above the trip, about 100 s of rated feedwater with no inflow; the 85% leaves 22 m³ of headroom. **Only the 12% low-low acts in the model; the 85% is display only** (owner decision of 2026-11-13), and the 25 / 75 / 85% limits are all UNVERIFIED estimates ([design-basis.md](design-basis.md)). Annunciator rows (#137), derived and stateless, owned by the deaerator: "Deaerator level low" (warning, below 25%), "Deaerator level high" (warning, from 75%) and "Feed pump trip" (error, follows `feedPumpTripped`, the 12% trip). The trip and tile for the 85% are #129.

## Not yet

No dump valve and no high-level protection: only the feed pump has its low-low trip and, from the boiler side, its trip on the boiler high-high level; the `deaerator within capacity` invariant checks the capacity. No O₂ reading or penalties (#114).
