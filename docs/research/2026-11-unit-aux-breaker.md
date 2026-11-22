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

1. **Interlock:** the unit aux and grid supply breakers are never closed together. One closed prevents closing the other.
2. **Unit aux auto-open:** the unit aux breaker opens on a speed drop (later: on loss of sync).
3. **Net output:** gross minus the auxiliary load.
4. **Start state:** the grid is always up for now, so the grid supply breaker starts closed and the unit aux breaker open, in every scenario and a new game, until grid-loss scenarios come.
5. **Control:** the unit aux breaker switch is on the Auxiliary bus page.

## What follows from the answers

- **Island (house load operation)** becomes generator breaker open plus unit aux breaker closed (the interlock keeps the grid supply open). The generator carries the auxiliary load as its shaft load, as house load does today.
- **Load rejection:** the generator breaker opening under load (by hand or on its ±2 rpm auto-open) with the unit aux breaker closed steps the unit to island; only a low load survives the step. Today this step comes from opening the grid supply breaker.
- **Net output** is gross minus aux whichever breaker feeds the bus; what changes is the flow through the generator breaker (gross with the bus on the grid supply, gross minus aux with it on the unit aux breaker).
- **Moving the bus between supplies** passes through a dead bus: open one incomer, then close the other. On that tick the pumps stop and the turning gear drops out (ADR 0053's dead-bus rules), unless the diesel holds the bus.
- **Start state** matches today's normal running (aux from the grid), so the goldens should not move except the house-load and load-rejection edge runs; the snapshots gain the field.

## Open points for the triage

- **Diesel and the interlock:** does the interlock also cover the diesel breaker, or may the diesel still parallel the grid supply as ADR 0053 allows today? And may it parallel the unit aux breaker (its rule today: onto a generator-fed bus only inside the ±2 rpm window)?
- **Speed-drop limit** for the unit aux auto-open: the same ±2 rpm window as the generator breaker, or a lower underspeed limit (sourced, or marked UNVERIFIED)?
- **Closing the unit aux breaker:** only with the turbine inside the speed window, or also onto a dead bus with the turbine at any speed?
- **Edge scenarios** `house-load-hold`, `load-rejection` and `house-load-short` are rewritten for the new path; `dark-start` keeps the grid supply open.
- **Electrical overview** redraw: the generator column goes up to the grid, a unit aux branch goes down to the aux bus; a `ui` follow-up or part of the same ticket.
