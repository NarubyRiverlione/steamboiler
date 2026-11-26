# Generation board: grid supply breaker and electrical readouts (design for #142)

Design sketch written before coding #142 (presentation only). Built from the triage brief on the ticket and the current `src/components/Generation/` components. #141's field names and refusal function were not read: the refusal function name below is a placeholder.

## Status panel

Two readouts join "Generator load" in the `board-readouts` row of `GenerationStatus`:

```
┌─ Generation Status ──────────────────────────────────────────────────┐
│ Generator load   Auxiliary load   Net output    Load setpoint  Breaker│
│ [ 42.0 MW ]      [  3.1 MW ]      [ 38.9 MW ]   [ 45.0 MW ]    [CLOSED]│
└──────────────────────────────────────────────────────────────────────┘
```

- Both new `Display`s use `widest="-999.9 MW"` so the width holds when the value goes negative.
- Net output is generator load minus auxiliary load. With the generator breaker open it reads `-3.1 MW`: the minus sign only, no "import" wording.

## Main area (`board-generation-main`, three groups)

```
┌─ Generator Breaker ─┐ ┌─ Grid Supply Breaker ─┐ ┌─ Generator Load ──────┐
│  ╔═══════════════╗  │ │  ╔═══════════════╗    │ │      (MW dial)        │
│  ║ hazard housing║  │ │  ║ hazard housing║    │ │   actual + setpoint   │
│  ║ [OPEN ◐CLOSED]║  │ │  ║ [OPEN ◐CLOSED]║    │ │                       │
│  ║  flip cover   ║  │ │  ║  flip cover   ║    │ │  Load setpoint (MW)   │
│  ╚═══════════════╝  │ │  ╚═══════════════╝    │ │      (knob)           │
│  Turbine speed      │ │                       │ │  [ 45.0 ]             │
│  [ 3000 RPM ]       │ │  Auxiliary bus        │ │                       │
│  Breaker            │ │  ● Auxiliary bus live │ │  (refusal msg, if any)│
│  ● Ready to close   │ │                       │ │                       │
│  (blocked msg)      │ │  (blocked msg)        │ │                       │
└─────────────────────┘ └───────────────────────┘ └───────────────────────┘
```

Grid Supply Breaker group (new, between the generator breaker and the load group):

- Same hazard housing, flip cover and `TurnSwitch tone="breaker"` as the generator breaker, so the two read as a pair. The cover state is local `useState`, as in `GeneratorBreakerGroup`.
- "Auxiliary bus live" lamp, `tone="ok"`: lit when either breaker is closed, unlit is a dead bus. No annunciator tile (revisit when #144 is triaged).
- No speed readout; the generator group keeps the speed beside its own breaker.

When the transfer rule blocks the switch:

- `disabled` is true and the refusal text goes in the switch `title`.
- The same text shows in a `board-lcd-msg` line under the lamp, as `GeneratorLoadGroup` does.
- Both come from #141's refusal function. The UI never re-implements the rule; the reducer refusal stays the backstop.

## Code shape

| File | Change |
|---|---|
| `GridSupplyBreakerGroup.tsx` (new) | Props: electrical state and `onToggleBreaker`. Calls the refusal function. |
| `GenerationStatus.tsx` | Two more `board-readout` blocks; takes the electrical state as a prop. |
| `Generation.tsx` | Adds the group to `board-generation-main`, wires `toggleGridSupplyBreaker`. |
| `usePowerPlant` | Exposes `toggleGridSupplyBreaker`, like `toggleGeneratorBreaker`. |
| `Generation.test.tsx` | Switch toggles; a refusal disables it and shows the reason; a negative net output renders. |
| Board reference doc | Update `dev/ui-board.md` if it lists the Generation page controls. |

## Open points

1. Layout width: `board-generation-main` now holds three groups; `board.css` was not checked for narrow-screen wrapping.
2. Order: Grid Supply is placed in the middle so the breakers stay together next to the load group. Placing it first would follow the power flow (grid, bus, generator).
3. The "Breaker" readout shows only the generator breaker; the ticket asks for no grid breaker readout.

Out of scope (from the ticket): the vital bus and UPS (#143, #144), an annunciator tile for the dead bus, any sim change.
