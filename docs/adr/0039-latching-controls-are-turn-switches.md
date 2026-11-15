# A control that holds a state is a turn switch; a pushbutton acts or selects

A control with two stable states (a valve, a pump, a breaker) is a two-position **turn switch** (`TurnSwitch`). Its label never changes: two lens-plate legends name the two positions (`CLOSED | OPEN`, `STOP | RUN`, `OFF | ON`), the legend of the selected position is lit like a lit `LensButton`, and the lever points at it. A **pushbutton** (`LensButton`) is only for a momentary action (ACK, RESET, the trip RESET beside each trip tile (ADR 0043), Presets) or for choosing one of several (speed mode, run-up point, playback speed). Decided in #124 from a prototype (branch `prototype/switch-styles`).

The controls it applies to: start-up vent, main steam valve, drain valve, air extraction pump, SJAE and the generator breaker. The attemperator Auto/Manual switch of the Steam page (`MANUAL | AUTO`, `machine` tone, no cover, #149) is one too. The generator breaker keeps a guard as a **flip cover** over the switch, in its hazard housing. Cover down, the switch is blocked and a click (or Space) lifts the cover; cover up, a click turns the switch and the cover strip (or Escape) puts the cover down. A breaker that may not close (out of the sync band) is disabled and shows why. The cover is UI state only; the plant state stays `generatorBreaker`.

## Considered options

- **Keep the pushbuttons and fix the labels:** rejected. One label can show the state (Closed) or the action (CLOSE), and the board used both: the main steam valve, drain valve and breaker showed the state, the vent, pump and SJAE showed the action, and a lit lens did not say what it was lit for. A real panel never changes a label.
- **Fixed-label pushbuttons, lit while on (`MSV`, `Start-up vent`):** rejected after the prototype. The lens says "on" but not what on means (open, running, made), and a dark button reads as a missing label. A switch shows both positions on the plate.
- **A lamp under each legend:** rejected. LEDs are the alarm and status language of the board; the legend as a lens plate reuses the lit and dark look of the buttons, so one rule covers the board.
- **Paired Open and Close buttons:** rejected. Twice the controls for one state, and the page already has `ValveControl` for the valves that need a position.
