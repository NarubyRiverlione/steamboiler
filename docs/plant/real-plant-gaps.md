# What a real plant has that this one does not

The owner's high-level view of how far the plant is from a real one. The order of work stays in [ROADMAP.md](../../ROADMAP.md) and the tickets; a row with no ticket is a candidate, not a plan. Deliberate departures with their figures are in [design-basis.md](design-basis.md). The plant to be, with what is already decided: [ADR 0029](../adr/0029-boiler-efficiency-from-flue-gas-heat-balance.md#where-it-sits-in-the-plant).

The rows come from general plant knowledge, not from a research note, so their effects are estimates (UNVERIFIED) unless an ADR is linked.

| Area | Missing | Effect on the sim | Status |
|---|---|---|---|
| **Steam** | Superheater, with spray attemperators to control its temperature | Very large: output, exhaust wetness, and a new control task | No ticket |
| | Reheat, where steam goes back to the boiler between turbine stages | Large, but only after a superheater | No ticket |
| **Feedwater** | Deaerator | Moderate | #40, parked |
| | Separate boiler feed pump; today one condensation pump pushes from the hotwell into 165 bar | Moderate, and a good operator task | Departure in [ADR 0031](../adr/0031-one-extraction-heater.md) |
| | Five to eight heaters instead of one | Efficiency only | Deliberate in [ADR 0031](../adr/0031-one-extraction-heater.md) |
| **Flue gas** | Air preheater | Efficiency | #90, parked |
| **Firing** | Air and flue gas fans, furnace purge, flame detection | Mainly a start-up sequence | No ticket |
| **Water quality** | Polishing, chemical dosing, continuous blowdown, the demineralising plant behind makeup | Almost no effect on the physics | No ticket |
| **Boiler** | Real drum, circulation, swell and shrink | Large for level control | Deliberately left out ([ADR 0019](../adr/0019-boiler-is-one-lumped-vessel.md)) |
| **Turbine** | Separate HP, IP and LP casings; moisture separators | Partly follows from the superheater | Separators are a departure in [ADR 0031](../adr/0031-one-extraction-heater.md) |
| | Gland seal steam, lube oil, turning gear | Start-up and shutdown steps | No ticket |
| | Overspeed trip | Protection | #72 |
| **Electrical** | Synchronising to a real grid, excitation, transformer | Operator task | Sync is planned as phase 5 in [turbine.md](turbine.md) |
| | Plant's own power use: pumps and fans take about 5 to 10% of output | Small and cheap to add; turns gross output into net | No ticket |
| **Cooling** | Cooling tower or river; the cooling water is always 10 °C | Seasonal effect on vacuum | No ticket |
