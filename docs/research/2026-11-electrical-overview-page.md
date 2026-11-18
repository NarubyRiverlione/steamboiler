# Electrical overview page: single-line schematic (design sketch)

Design sketch written before any ticket exists. Companion of [2026-11-generation-board-electrical.md](2026-11-generation-board-electrical.md) (#142: the controls and breakers stay on the Generation page; this page only shows the state). Not a ticket and not a decision: a new idea stays `needs-triage` until the owner promotes it.

Built from the milestone plan in [ADR 0046](../adr/0046-from-island-to-town-grid-in-milestones.md), the tickets #140 (consumers), #141 (grid supply breaker, auxiliary bus), #143 (vital bus, UPS), #144 (red emergency board, UPS panel) and #169 (onsite diesel generator), and the style of `src/navigation/PlantOverview.tsx` and `plantDiagram.ts`. #141, #143 and #169 were not built when this was written, so every state field name below is a placeholder.

## Style

Same as the plant overview page: an SVG drawn from a data file (nodes, pipes, labels) with the `power` medium, inside `PanelFrame`. A node with controls links to the page that holds them (breakers to Generation, the UPS breaker to the UPS panel); a read-only node is shown but not clickable. Live values are LCD labels beside the nodes and the existing Values toggle hides them.

## Voltages are dummy numbers

No voltage is modelled. A bus shows a fixed nominal value when live and 0 when dead. They exist only to show whether a bus is powered, so no sim change and no new state.

| Bus | Live | Dead |
|---|---|---|
| Grid | 110 kV | 0 kV |
| Generator terminal (GEN) | 10.5 kV | 0 kV |
| Auxiliary bus | 6.0 kV | 0 kV |
| Vital bus | 230 V | 0 V |

The nominal numbers are arbitrary labels, not sourced figures. If it is ever wanted that they follow the load, that is a separate sim ticket.

## Sketch

```
 GRID 110 kV ● ──[ Grid supply ▮ ]──────┐
                                        │
 GEN  10.5 kV ● ──[ Gen breaker ▮ ]─────┼───── AUXILIARY BUS 6.0 kV ●
                                        │          │
 DIESEL ○ ──[ DG breaker ▯ ]────────────┘          ├─ ● Boiler feed pump      4.5 MW
 (onsite diesel generator, #169)                   ├─ ● Recirculation pump    1.7 MW
                                                   ├─ ● Condensation pump     0.4 MW
                                                   ├─ ● Air extraction pump   0.1 MW
                                                   ├─ ○ Lube oil pump         0.0 MW
                                                   ├─ ○ Turning gear motor    0.0 MW
                                                   │
                                                   │   Auxiliary load  6.7 MW
                                                   │
                                                   └──[ feed ▮ ]── VITAL BUS 230 V ●
                                                                      │
                                         [ UPS breaker ▯ ]── UPS ▮▮▮▯ 87 %
```

Legend: ● live or drawing power, ○ dead or idle, ▮ closed, ▯ open.

## Elements

- **Sources:** grid, generator and diesel generator, each with its breaker drawn closed or open. A source that is not feeding the bus is drawn dimmed.
- **Auxiliary bus:** one busbar with its voltage `Display`. The three source breakers join it.
- **Consumers:** the six metered by #140, each with a `Led` (lit while it draws power) and its MW as an LCD label. The Auxiliary load total sits under the list.
- **Vital bus:** hangs off the auxiliary bus through a feed link. Its voltage `Display` reads 0 V when the auxiliary bus is dead and the UPS breaker is open.
- **UPS:** the UPS breaker, the battery symbol and the charge in percent (no countdown, as #144 says). The UPS breaker is the one control that works on a dead vital bus, so it stays clickable when the rest of the page is dark.
- **Dead bus:** the bus line and everything downstream are drawn dimmed, so a dead bus is readable at a glance.

## Behaviour

- Read-only except the links to the controls. The page changes no state and re-implements no rule; every lit, dimmed or closed state is read from the sim state of #141, #143 and #169.
- On a dead vital bus the board goes red (#144). Whether this page also goes red, or stays as a diagnostic that keeps its own power, is an open point.

## Open points

1. **Diesel generator:** #169 is not built; the diesel is drawn with an open breaker and no figures until it is.
2. **Dead vital bus on this page:** red like the rest of the board, or the one page that stays readable? A dark start is exactly when the operator needs the diagram.
3. **Consumer order:** the order above follows the #140 table (largest first); an alternative is by plant part.
4. **Navigation:** route `/electrical` in `AppRoutes.tsx` and an **Electrical overview** lens button in the header after Plant overview (decided in #171). A node on the plant overview linking to it is not decided.

## If it becomes a ticket

Label `ui`, with `needs-triage` until promoted, blocked by #141 (breakers and bus), #143 (vital bus and UPS) and #169 (diesel). Presentation only, with tests in the style of `PlantOverviewValues.test.tsx`, and an update of `dev/ui-board.md`.
