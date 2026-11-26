# Unit aux breaker: the generator breaker to the grid, a second breaker to the aux bus (design sketch)

Design sketch from a 2026-11-22 discussion with the owner, written before the ticket is triaged. Not a decision yet: the answers below are the owner's, and they become rules when the ticket edits [ADR 0053](../adr/0053-the-auxiliary-bus-is-fed-by-the-grid-or-the-generator.md) in place. A new idea stays `needs-triage` until the owner promotes it.

## Why

Today the power path is `Generator ─[Generator breaker]─ Aux bus ─[Grid supply breaker]─ Grid`: the grid supply breaker is the plant's tie to the grid and carries the export too (ADR 0053), and house load operation is "grid supply open, generator breaker closed". On the Electrical overview (#171) the generator breaker therefore feeds the aux bus, not the grid, which does not read like a real unit.

The owner wants the generator breaker to connect the generator to the grid, and a second breaker to let the generator feed its own aux bus, so the plant can later run as an **island** on its own power with no grid (ADR 0046: island means house load operation).

## Layout

```
               GRID
       ┌────────┴─────────┐
 [Generator          [Grid supply
  breaker]            breaker]        ← station supply only, no export
       │                  │
 Generator ─┐             │
            │             │
   [Unit aux breaker]     │       [Diesel breaker]── Diesel
            │             │              │
   ═════════╧══ Aux bus ══╧══════════════╧══
```

- **Generator breaker:** the generator's only path to the grid; synchronising and the export go through it. The ±2 rpm auto-open stays (ADR 0027).
- **Unit aux breaker (new):** the generator feeds the aux bus.
- **Grid supply breaker:** the station supply from the grid to the aux bus; no export.
- **Transformers:** left out for now (owner, 2026-11-22). They stay in [real-plant-gaps.md](../plant/real-plant-gaps.md).

## Owner's answers

1. **Seamless transfer, not a plain interlock** (revised the same day): the unit aux and grid supply breakers are never closed together for longer than a tick, but moving the bus between them must not stall the pumps. With the grid supply closed and the turbine at speed, closing the unit aux breaker opens the grid supply breaker on the same tick, with no dead bus. The owner accepts this is not fully realistic (a real plant uses a fast or make-before-break transfer); it stands in until frequency and sync are modelled. The transfer back mirrors it: closing the grid supply breaker while the unit aux breaker is closed opens the unit aux breaker on the same tick (confirmed by the owner).
2. **Unit aux auto-open and closing:** the unit aux breaker closes only with the turbine inside the ±2 rpm window and auto-opens when the speed leaves it, like the generator breaker, until frequency and sync are modelled (later: on loss of sync).
3. **Net output:** gross minus the auxiliary load.
4. **Start state:** the grid is always up for now, so the grid supply breaker starts closed and the unit aux breaker open, in every scenario and a new game, until grid-loss scenarios come.
5. **Control:** the unit aux breaker switch is on the Auxiliary bus page.
6. **Diesel breaker** (owner): it may close while the unit aux or the grid supply breaker is closed, with its rule of ADR 0053 (onto a grid-fed bus always, onto a generator-fed bus inside the ±2 rpm window). This is the stand-in for auto-sync, so a diesel can be ready to take over in a later grid-loss scenario. The diesel is not part of the transfer.
7. **Electrical overview redraw** is part of the same ticket: without it the page would show the old path the moment the sim changes.

## What follows from the answers

- **Island (house load operation)** becomes generator breaker open plus unit aux breaker closed (closing the unit aux breaker opened the grid supply). The generator carries the auxiliary load as its shaft load, as house load does today.
- **Load rejection:** the generator breaker opening under load (by hand or on its ±2 rpm auto-open) with the unit aux breaker closed steps the unit to island; only a low load survives the step. Today this step comes from opening the grid supply breaker.
- **Net output** is gross minus aux whichever breaker feeds the bus; what changes is the flow through the generator breaker (gross with the bus on the grid supply, gross minus aux with it on the unit aux breaker).
- **Moving the bus between supplies** never passes through a dead bus: the closing incomer opens the other on the same tick, so the pumps keep running and the turning gear stays in.
- **Start state** matches today's normal running (aux from the grid), so the goldens should not move except the house-load and load-rejection edge runs; the snapshots gain the field.

## Still to do in the ticket

- **Edge scenarios** `house-load-hold`, `load-rejection` and `house-load-short` are rewritten for the new path; `dark-start` keeps the grid supply open. A new edge run for the transfer: the pumps never stop.
