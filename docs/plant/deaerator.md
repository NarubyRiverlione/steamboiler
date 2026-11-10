# Deaerator (vessel)

The feedwater tank between the hotwell and the boiler, as built in #119: [ADR 0036](../adr/0036-deaerator-is-a-steam-heated-tank.md) (the steam-heated tank held at 3 bar) and [ADR 0037](../adr/0037-deaerator-cold-fill-at-38-percent.md) (the 38% cold fill). The air model, vents, relief valve and panel are #120 ([ADR 0038](../adr/0038-deaerator-air-and-vents.md)); the boiler feed pump is #112. Code: `src/context/Deaerator/DeaeratorTick.ts` (pure function), wired in `PowerPlantTick`; constants in `CstDeaerator`.

## Path

hotwell → condensation pump → **deaerator** → heater → economizer → boiler. The heater stays in series after the deaerator; its drain cascades back into the deaerator ([turbine.md](turbine.md#extraction-heater-88)).

## The vessel

One lumped tank, perfectly mixed (ADR 0019 style): water mass in kg, one temperature, the volume derived from the mass at that temperature ([ADR 0007](../adr/0007-water-state-is-mass-in-kg.md)). Pressure is the saturation pressure of the water (never below atmospheric), as in the boiler; there is no air yet, so there is no separate pressure physics. Total volume `TotalVolume` 150 m³.

| State (`Deaerator`) | Meaning |
|---|---|
| `waterMass`, `waterVolume` | the water held (kg, litres) |
| `temperature`, `pressure` | °C and bar; the controlled value is the pressure, 3 bar (133.5 °C) |
| `extractionFlow`, `extractionValvePosition` | kg/s taken at the turbine tap, and the share of the valve capacity it is |
| `letDownFlow`, `letDownValvePosition` | kg/s taken from the boiler through the let-down valve, and the share of its capacity |
| `tapDemand` | kg/s the pressure loop asks of the tap for the next tick |
| `outflowMass` | kg that left toward the boiler over the last tick |

## Pressure control: one loop, split range

Each tick the heat needed to bring the stored water and everything that enters (Return, heater drain) to the 3 bar setpoint is the **demand**. Steam supplies it, tap first, boiler for the rest:

- **Extraction valve (tap):** the tap of [ADR 0031](../adr/0031-one-extraction-heater.md) passes steam only while the heater-line pressure at the tap is above the setpoint (the non-return valve: no flow back into the turbine). Flow grows with the pressure margin, fully open at `ExtractionOpeningRange` (50%) of the setpoint above it, so there is no step when the tap crosses 3 bar. It is limited to the turbine flow the heater leaves, to the valve capacity `ExtractionValveCapacity` (60 kg/s) and to the demand of the **last tick**: the condenser runs after the exhaust flow is known, so the tap steam is fixed before it (a lag of 0.1 s, like the heater).
- **Let-down valve (auxiliary line):** boiler steam through a pressure-reducing valve, for what the tap did not give (turbine closed, tripped, low load, cold start). Its capacity `LetDownCapacity` (50 kg/s) scales with the boiler pressure like the steam valves ([ADR 0026](../adr/0026-valve-flow-follows-pressure.md)), and it passes nothing while the boiler pressure is at or below the deaerator pressure: the pressure needed at start-up falls out of the physics. It is shut while the burner low-low trip holds (a tripped boiler gives no steam away; the trip latches, so the valve does not chatter). The bypass does not feed the deaerator.
- The steam of both valves mixes into the water at its own enthalpy (tap: the tap enthalpy; let-down: saturated vapour at the boiler pressure, throttled at constant enthalpy). It never cools the water: with nothing to heat the demand is zero and the temperature may drift above the setpoint (a hot drain with no Return).

## Outflow (pass-through until #112)

What leaves toward the boiler is what entered plus the steam that heated it: **out = intake + heater drain + condensed steam**. The steam that heats the *stored* water stays in the tank, so the level rises while it warms (below); once hot the stored water takes no more and the level stays put. The boiler receives the outflow in the same tick, after the heater has heated it ([feedwater-loop.md](feedwater-loop.md#return-and-capacity)). The let-down steam leaves the boiler as steam and comes back in the outflow as water. This is a deliberate simplification until the feed pump of #112 ([design-basis.md](design-basis.md)).

## Cold fill and start-up (ADR 0037)

The vessel starts at 38% of 150 m³ (57 m³) at ambient. Heating to 3 bar raises the level by about 31% of the volume (7% thermal expansion, about 22% more mass from condensed steam), measured in the headless runner: **38% cold → 50.1% hot** (`bypass-loop`, `turbine-runup`; 50.4% after the turbine runs). The hand estimate holds, so ADR 0037 is accepted. The warm-up takes about 12 t of steam from the boiler through the let-down valve, so it opens as soon as the boiler is above atmospheric; the deaerator is hot after about 10 min in `bypass-loop` (full gas) and 24 min in `turbine-runup`. That draw, about 28 GJ, delays the boiler pressure build: `bypass-loop` reaches the working band at about 1500 s (284 s before) and `turbine-runup` at about 1870 s (1234 s before).

## Heater and economizer

The heater takes the deaerator outflow as its feedwater (flow and temperature of the last tick for the extraction, the actual ones for the heating) and gives it to the economizer at about 150 °C at rated flow. The economizer and the flue gas balance ([ADR 0029](../adr/0029-boiler-efficiency-from-flue-gas-heat-balance.md)) take the temperature **after the heater**, which is what physically enters the economizer; below about 64% of the rated flow the heater is off and it is the deaerator temperature, 133.5 °C. With the turbine closed or tripped the let-down valve holds 3 bar (the `turbine-trip` edge scenario).

## Measured

`turbine-load`, 125 MW: steam 176 kg/s, deaerator tap 38 kg/s, heater 5 kg/s, tap 4.6 bar, feedwater 144 °C after the heater and 198 °C after the economizer, stack 229 °C, boiler 90.0%, plant 32.4% (33.2% with the heater alone in #88, the let-down steam at low load and the lower tap pressure cost about 0.8 points). The two extractions together take about the same share of the flow as the heater alone did (`ratedExtractionShare`), so the rated output is 141.9 MW (141.3 before) and `RatedSteamFlow` stays 192 kg/s (`max-output` still reads it within 3 kg/s).

## Not yet

No air model, vents, relief valve, dump valve, level protections or panel (#120): the level is not limited, only the `deaerator within capacity` invariant checks it. No feed pump (#112).
