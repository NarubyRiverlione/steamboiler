# The deaerator is a steam-heated tank on the feedwater path, held at 3 bar

A deaerator sits between the hotwell and the boiler. It heats the feedwater to saturation so dissolved gas comes out, and the steam scrubs the gas to the vent. Decided in #40; built in #119 (the vessel) and #120 (the air, vents, relief valve and panel, [ADR 0038](0038-deaerator-air-and-vents.md)); the boiler feed pump is #112 (built).

## The model

- **Vessel:** a lumped tank in the style of [ADR 0019](0019-boiler-is-one-lumped-vessel.md). The pressure is the saturation pressure of the water plus the air pressure ([ADR 0038](0038-deaerator-air-and-vents.md), #120); the 3 bar setpoint is the saturation temperature the steam control heats to.
- **Control:** a steam inlet valve holds the pressure at a fixed **3 bar** (about 134 °C). The valve is an enthalpy input (steam mass flow times latent heat into the water). No sliding pressure. The operator reads pressure (controlled) and saturation temperature (check).
- **Steam source:** extraction plus an auxiliary line. The turbine tap of [ADR 0031](0031-one-extraction-heater.md) (5 bar) holds 3 bar at load, with a non-return valve against backflow into the turbine. The auxiliary line comes from the boiler through a pressure-reducing (let-down) valve and takes over when the tap falls below the setpoint (trip, closed valve, low load, cold start). The two valves work in split range on the one pressure loop. The bypass does not feed the deaerator; it feeds the condenser.
- **Steam only from the plant:** there is no auxiliary steam header, like the SJAE ([research](../research/2026-11-sjae-motive-steam.md)). The let-down valve passes steam only while boiler pressure is above deaerator pressure, so the pressure needed at start-up falls out of the physics. The idea of a 5 bar minimum boiler pressure is dropped.
- **Heater stays in series after the deaerator**, before the economizer. By position in a real train it plays the HP role, so the docs name it by position, not "LP". Its drain **cascades back into the deaerator**, as [real-plant-gaps.md](../plant/real-plant-gaps.md) describes, replacing ADR 0031's pump-forward into the Return. The drain's heat replaces some heating steam.
- **Outflow (the boiler feed pump, #112):** all the heating steam condenses into the tank and the **boiler feed pump** takes the water out toward the boiler, at its own valve position, limited by the water held and the room in the boiler. It holds the drum level; the condensation pump, which keeps its name and its place at the hotwell, holds the deaerator level by plain level feedback. The feed pump trips on a deaerator low-low level of 12% ([design-basis.md](../plant/design-basis.md)). Pump head is not modelled: both pumps are flow actuators on one 300 L/s capacity, so there is no new magic number. This replaces the temporary pass-through of #119.
- **Economizer inlet:** the economizer and the flue gas balance ([ADR 0029](0029-boiler-efficiency-from-flue-gas-heat-balance.md)) take the temperature of the water that enters them, the **heater outlet** (about 150 °C at rated flow; the deaerator outlet, the saturation temperature at the deaerator pressure, when the heater is off). Chosen in #119: the heater is in series between the deaerator and the economizer. Chain: steam valve, pressure, saturation temperature, heater, economizer inlet, stack temperature and boiler efficiency. It stays this way after #112, because pump work is ignored ([ADR 0030](0030-return-pays-real-enthalpy.md)).
- **Tank size:** 5 minutes of rated feedwater (192 kg/s, about 58 t), measured from the 50% working level down to the low-low trip (12%, so 38% of the volume is the 5 minutes): about **150 m³**. The alternative, the water at the 50% level, gives 117 m³. Bands, all estimates: low alarm 25 to 30%, low-low 10 to 15%, high alarm 70 to 75%, high-high 85 to 90% (dump valve, extraction isolation). Recorded in `design-basis.md`.

The numbers: 3 bar and the 38% cold fill (ADR 0037) were checked in the headless runner in #119 (50.1% hot). The 150 m³ is not tested by any scenario yet (the level bands are still open); the bands are hand estimates. The tap steam opens in proportion to the pressure margin over 3 bar and the let-down valve is shut while the burner low-low trip holds (#119).

## Considered options

- **Heater replaced by the deaerator:** the economizer inlet would drop to about 134 °C and the cycle loses part of the 1.8 points of ADR 0031. Rejected: the heater stays in series (about 150 °C again).
- **Sliding pressure:** rejected, a fixed 3 bar keeps one loop and one setpoint.
- **Auxiliary steam header at a minimum boiler pressure:** rejected, see above.
- **Let the level drift with the condensed steam:** rejected, the outflow takes it out.
- **Tank sized on the water at 50%:** rejected, 117 m³ leaves no 5 minutes above the trip.

## Consequences

- [ADR 0031](0031-one-extraction-heater.md) is edited: the drain goes to the deaerator and "#40 stays parked" goes. [ADR 0002](0002-makeup-into-hotwell.md) gains the deaerator on the path from the hotwell to the boiler; makeup still enters the hotwell. [ADR 0011](0011-hotwell-protections-in-the-tick.md) no longer says the sim has no deaerator.
- `feedwater-loop.md`, `turbine.md`, `condenser.md` and a new `deaerator.md` change in the same commit as the build.
- The loop invariants must still close with the new vessel.
- Drawing it in the overview schemas is #118; the O₂ readout and corrosion are #114.
