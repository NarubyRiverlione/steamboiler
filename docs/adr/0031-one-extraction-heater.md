# One passive extraction heater heats the Return, with its drain pumped forward

One extraction heater takes steam from the turbine at about 5 bar and heats the Return to about 150 °C at rated flow, before the economizer. Hand estimates give about 1.9 points of plant efficiency, about 6% less fuel per MWh ([research](../research/2026-11-extraction-heaters.md)). Decided in #88.

## The model

- **Turbine:** two sections on the same expansion line, each at `IsentropicEfficiency`: boiler pressure to the tap with the full flow, then the tap to the condenser with what is left. With no extraction this gives today's output and exhaust quality, so [ADR 0022](0022-electric-output-from-enthalpy-drop.md) and [ADR 0028](0028-exhaust-splits-by-quality-at-condenser-intake.md) are its zero-extraction case.
- **Tap pressure:** proportional to turbine flow, from about 5 bar at rated.
- **Heater:** a closed heater with no vessel of its own. Its pressure is the tap pressure less about 6% for the line, and the Return leaves about 2 K below that saturation temperature. There is no sized surface.
- **Extraction steam:** follows from the heat the Return takes.
- **Heater drain:** pumped forward into the Return after the heater, so its heat stays in the water.
- **Passive:** no operator controls, no drain level, no cut-in load, no thermal mass. The heater fades with load and stops when the turbine stops.

## Considered options

- **Drains to the condenser:** the ticket's first idea. Rejected: it throws away the condensed steam's heat, and above about 160 °C the plant ends up worse than with no heater.
- **Three taps, 180 to 210 °C:** rejected for now. They add about 1.3 points, and at the higher end the full-gas flow exceeds the 200 kg/s turbine valve.
- **A 230 to 250 °C Return:** rejected. That is a figure for a long heater train with an air preheater. With one heater it takes 40% or more of the steam for almost no gain, because the economizer has less to recover and the stack rises.
- **An open heater, like a deaerator:** rejected. The thermodynamics are the same, but it needs a vessel with a level, a second pump and a change to [ADR 0002](0002-makeup-into-hotwell.md). #40 stays parked for that.
- **The air preheater in this ticket:** rejected. It is worth about as much again, but it is its own component and reopens [ADR 0029](0029-boiler-efficiency-from-flue-gas-heat-balance.md). It has its own ticket, #90.

## Consequences

- Rated steam flow and output are re-derived the same way as [ADR 0030](0030-return-pays-real-enthalpy.md), expected at about 195 kg/s, still below the 200 MWe class. The economizer surface, the turbine valve and the relief valve sizing stay as they are; the condenser utilities gain spare capacity.
- The stack rises to about 240 °C and boiler efficiency falls to about 89.5%. The heater pays for this, but only just over half its cycle gain survives.
- On a turbine trip the Return turns cold at once.
- A real plant has a separate feed pump and five to eight heaters, and a wet turbine has moisture separators. The exhaust stays about 34% wet against sourced limits of 10 to 15%. These are departures in [design-basis.md](../plant/design-basis.md).
- No plant with saturated steam above about 70 bar was found. The closest sources are nuclear and coal units.
