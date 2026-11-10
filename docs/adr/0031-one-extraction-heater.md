# One passive extraction heater heats the Return; its drain cascades into the deaerator

One extraction heater takes steam from the turbine at about 5 bar and heats the Return to about 150 °C at rated flow, before the economizer. Hand estimates give about 1.9 points of plant efficiency, about 6% less fuel per MWh ([research](../research/2026-11-extraction-heaters.md)). Decided in #88.

## The model

- **Turbine:** two sections on the same expansion line, each at `IsentropicEfficiency`: boiler pressure to the tap with the full flow, then the tap to the condenser with what is left. With no extraction this gives today's output and exhaust quality, so [ADR 0022](0022-electric-output-from-enthalpy-drop.md) and [ADR 0028](0028-exhaust-splits-by-quality-at-condenser-intake.md) are its zero-extraction case.
- **Tap pressure:** proportional to turbine flow, from about 5 bar at rated.
- **Heater:** a closed heater with no vessel of its own. Its pressure is the tap pressure less about 6% for the line, and the Return leaves about 2 K below that saturation temperature. There is no sized surface.
- **Extraction steam:** follows from the heat the Return takes.
- **Heater drain:** cascades back into the deaerator ([ADR 0036](0036-deaerator-is-a-steam-heated-tank.md), #40), so its heat stays in the water. Until #40 is built it is pumped forward into the Return after the heater, as built in #88.
- **Passive:** no operator controls, no drain level, no cut-in load, no thermal mass. The heater fades with load and stops when the turbine stops.

## As built (#88)

- **One tick of lag:** the condenser runs after the exhaust flow is known, so the extraction follows the Return and hotwell temperature of the last tick (0.1 s). The heater drain is the extraction steam actually taken, and the Return and drain together reach the economizer at the mixed enthalpy (never above the heater saturation), so heat and mass close exactly whatever the lag.
- **Shaft power** takes the extraction of the last tick, as it takes the steam flow of the last tick. The no-load loss and the inertia still come from the rated flow and drop, with the rated output counting the extraction.
- **Turbine trip:** the `turbine-trip` edge scenario shuts the turbine valve at 125 MW and dumps the steam through the bypass. The extraction stops at once and the Return turns cold; pressure falls to about 136 bar. Closing the main steam valve instead, with the gas left on, took the boiler to 209 bar through a numerical jump of the flash solver at about 355 °C and 177 bar (steam inventory condensed in one tick). The cause was not looked into; it is not caused by the heater, but by a plant state with the valve shut and the Return cold. It belongs to a ticket of its own.

## Considered options

- **Drains to the condenser:** the ticket's first idea. Rejected: it throws away the condensed steam's heat, and above about 160 °C the plant ends up worse than with no heater.
- **Three taps, 180 to 210 °C:** rejected for now. They add about 1.3 points, and at the higher end the full-gas flow exceeds the 200 kg/s turbine valve.
- **A 230 to 250 °C Return:** rejected. That is a figure for a long heater train with an air preheater. With one heater it takes 40% or more of the steam for almost no gain, because the economizer has less to recover and the stack rises.
- **An open heater, like a deaerator:** rejected. The thermodynamics are the same, but it needs a vessel with a level, a second pump and a change to [ADR 0002](0002-makeup-into-hotwell.md). Taken up in #40 as a separate deaerator, [ADR 0036](0036-deaerator-is-a-steam-heated-tank.md); the heater stays in series after it.
- **The air preheater in this ticket:** rejected. It is worth about as much again, but it is its own component and reopens [ADR 0029](0029-boiler-efficiency-from-flue-gas-heat-balance.md). It has its own ticket, #90.

## Consequences

- Rated steam flow and output are re-derived the same way as [ADR 0030](0030-return-pays-real-enthalpy.md). Built in #88: measured 192 kg/s (the hand estimate was about 195), 141 MWe, still below the 200 MWe class. The rated output counts the extraction: the flow times the drop that does work, so it is less than the flow times the plain drop (162 MW); the tap pressure is proportional to the flow, so it moves with this figure (5 bar at 192 kg/s). The economizer surface, the turbine valve and the relief valve sizing stay as they are; the condenser utilities gain spare capacity.
- The stack rises to about 240 °C and boiler efficiency falls to about 89.5%. The heater pays for this, but only just over half its cycle gain survives. Measured in #88 at 125 MW: stack 227 °C, boiler 90.1%, plant 33.2% against 31.4% before, a gain of 1.8 points.
- On a turbine trip the Return turns cold at once.
- A real plant has a separate feed pump and five to eight heaters, and a wet turbine has moisture separators. The exhaust stays about 34% wet against sourced limits of 10 to 15%. These are departures in [design-basis.md](../plant/design-basis.md).
- No plant with saturated steam above about 70 bar was found. The closest sources are nuclear and coal units.
