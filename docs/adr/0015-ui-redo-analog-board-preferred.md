# The UI redo: a strong preference for the analog board (proposed, not decided)

**Status: proposed.** [ADR 0010](0010-ui-redo-industrial-style.md) set out two styles for a UI redo and chose neither. The Boiler panel mockup it called for now exists, and the owner strongly prefers **option A, the analog control-room board in the MC-v2 language**, over option B, the ISA-101 DCS screen. This is a preference, not the choice. ADR 0010 stays open until a later ADR records the decision and supersedes both.

## The mockup

[0015-boiler-panel-mockup.html](0015-boiler-panel-mockup.html) is a static page (also published as [an artifact](https://claude.ai/artifact/LbPkj37si8dfBUyrGgbA5A)). It shows both ideas side by side for the Boiler panel, and both are driven by one shared plant state. Its plant numbers are illustrative: a rough stand-in moves them, not the simulator. The limits come from the design basis.

- **A, analog board:** the plate, screws, stencil title, LCD readouts, lens buttons, bezel LEDs and hazard housing come from MC-v2. New are a round pressure gauge with zones, a drum level gauge with zones (#54), a continuous gas knob (#41: drag, scroll or arrow keys), an annunciator that flashes until ACK, and a mimic strip.
- **B, DCS screen:** grey and flat, with colour only for abnormal states. It has a pressure trend, process-value bars with normal bands, a gas faceplate and an alarm list with priority shapes.

## Consequences

- Future UI work should lean towards option A unless the final decision goes the other way.
- The rest of ADR 0010 still holds: nothing is built until the style is decided, the open UI tickets (#54, #41, #24, #36) fold into the chosen style, and MC-v2 components are copied and adapted into this repo, not shared as a package. The LiquidCrystal font licence must be checked first.
