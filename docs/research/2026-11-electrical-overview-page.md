# Electrical overview page: single-line schematic (design sketch)

Design sketch, updated at the #171 triage (2026-11-22); the ticket's agent brief is the contract. Companion of [2026-11-generation-board-electrical.md](2026-11-generation-board-electrical.md) (this page only shows the state; the controls sit on Generation, Auxiliary bus and Diesel generator).

Built from the milestone plan in [ADR 0046](../adr/0046-from-island-to-town-grid-in-milestones.md), the tickets #140 (consumers), #141 (grid supply breaker, auxiliary bus), #143 (vital bus, UPS), #144 (red emergency board, UPS panel) and #169 (onsite diesel generator), and the style of `src/navigation/PlantOverview.tsx` and `plantDiagram.ts`. All of them are built now; the field names below are the real ones.

## Style

Same as the plant overview page: an SVG drawn from a data file (nodes, pipes, labels) with the `power` medium, inside `PanelFrame`. A node with controls links to the page that holds them (breakers to Generation, the UPS breaker to the UPS panel); a read-only node is shown but not clickable. Live values are LCD labels beside the nodes and the existing Values toggle hides them.

## Voltages are dummy numbers

No voltage is modelled. A bus shows a fixed nominal value when live and 0 when dead. They exist only to show whether a bus is powered, so no sim change and no new state (#171 triage).

| Bus | Live | Dead |
|---|---|---|
| Grid | 110 kV, always (the rest of the grid is always there, ADR 0046) | never |
| Auxiliary bus | 6.0 kV (`isBusLive`) | 0 kV |
| Vital bus | 230 V (`isVitalBusLive`) | 0 V |
| Safety bus | 110 V DC (`isSafetyBusLive`) | 0 V |

No generator terminal voltage: when it would count as live is itself a rule. The nominal numbers are arbitrary labels, not sourced figures. If they should ever follow the load, that is a separate sim ticket.

## Sketch

```
 GRID 110 kV ● ──[ Grid supply ▮ ]──────┐
                                        │
 GENERATOR ● ──[ Gen breaker ▮ ]────────┼───── AUXILIARY BUS 6.0 kV ●
                                        │          │
 DIESEL ○ ──[ DG breaker ▯ ]  0.0 MW ───┘          ├─ ● Boiler feed pump      4.5 MW
                                                   ├─ ● Recirculation pump    1.7 MW
                                                   ├─ ● Condensation pump     0.4 MW
                                                   ├─ ● Air extraction pump   0.1 MW
                                                   ├─ ○ Lube oil pump         0.0 MW
                                                   ├─ ○ Turning gear motor    0.0 MW
                                                   │
                                                   │   Auxiliary load  6.7 MW
                                                   │
                                                   └── VITAL BUS 230 V ●

                       UPS 87 % ──[ UPS breaker ▮ ]── SAFETY BUS 110 V DC ●
```

Legend: ● live or drawing power, ○ dead or idle, ▮ closed, ▯ open.

## Elements

- **Sources:** grid, generator and diesel generator, each with its breaker drawn closed or open. A source is drawn lit while its breaker is closed and dimmed while it is open. The diesel carries a MW label (`dieselOutput`), which shows whether it carries the load (a paralleled diesel runs unloaded).
- **Auxiliary bus:** one busbar with its voltage. The three source breakers join it.
- **Consumers:** the six metered by #140, largest first, each with a `Led` (lit while it draws power) and its MW as an LCD label, from a per-consumer export in the sim; the Auxiliary load total sits under the list.
- **Vital bus:** hangs off the Auxiliary bus; live with it (ADR 0055). Only the busbar, no consumers drawn.
- **Safety bus:** fed by the UPS through the UPS breaker; live while the breaker is closed and the charge is above 0. Only the busbar, the UPS breaker state and the UPS charge in percent (no countdown). Its loads (emergency light, breaker control, emergency oil pump) are not drawn; #159 may add its pump node.
- **Dead bus:** the bus line and everything downstream are drawn dimmed, so a dead bus is readable at a glance.

## Behaviour

- Read-only except the links: the grid supply breaker and the UPS link to the Auxiliary bus page, the generator breaker to Generation, the diesel to the Diesel generator page. The page changes no state and re-implements no rule.
- It follows the board state of #144 like every page: in the emergency state the LCD labels go blank and the mimic (lit and dimmed lines, LEDs) stays readable, so a dark start can be read from it. In the dark and ended states there are no pages.
- Navigation: route `/electrical`, an **Electrical overview** lens button in the header after Plant overview; not a part, so outside `PARTS` and the Page Up/Down cycle; no node on the plant overview links to it.
