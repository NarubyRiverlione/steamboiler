# A UI redo in an industrial style: the analog control-room board

**Status: decided.** The owner chose **option A, the analog control-room board in the MC-v2 language**, over option B, the ISA-101 DCS screen (#75). The redo has the lowest priority, `P5` ([ADR 0024](0024-ticket-priority-by-kind-of-work.md)): the physics goes first.

The work so far went to the physics on purpose: it is the core of the simulator. The headless runner (`pnpm sim`, [dev/headless-runner.md](../dev/headless-runner.md)) made that work possible: every physics and parameter change is judged on its report, not in the app, and before it existed the project was stuck. The website's UI and UX get a complete redo in an industrial style: panels, readouts, knobs.

A redo replaces only the presentation (`src/components/`, `src/navigation/`). The simulation core (`src/context/`, `src/utils/`, the reducer and the tick) is decoupled from React, so the headless runner, the snapshots and the physics stay as they are.

## Considered options

- **A, analog control-room board (1960s to 80s), with MC-v2 as inspiration:** a grey enamel panel with round gauges and red arcs, level gauges with zones, rotary knobs, guarded toggle switches, annunciator tiles that flash until acknowledged, and a mimic diagram of the piping. The local reboot of the missile-boat project ([missile-boat-fire-control](https://github.com/NarubyRiverlione/missile-boat-fire-control), `~/Development-Eigen/MC-v2`) already has the visual language: `PanelFrame` (plate, inset panel, screws, stencil title, itself described as "Powerplant-style"), an LCD `Display`, a bezel `Led`, an illuminated `Button`, a rotary `Selector`, a hazard-striped housing, the `console.css` tokens and bundled fonts, all pure SVG and CSS. The steamboiler would add a round gauge, a level gauge, a continuous knob, a toggle or breaker switch, annunciator tiles, a mimic diagram and possibly a strip-chart recorder. Smaller and older plants were run from boards like this, so it fits the realism rule.
- **B, modern DCS screen (ISA-101 high-performance HMI):** a deliberately grey, flat screen where colour marks only abnormal states and trends carry most of the information. This is how plants are run today, but it has no knobs and no skeuomorphic controls.

## The mockup

[0015-boiler-panel-mockup.html](0015-boiler-panel-mockup.html) is a static page (also published as [an artifact](https://claude.ai/artifact/LbPkj37si8dfBUyrGgbA5A)). It shows both ideas side by side for the Boiler panel, and both are driven by one shared plant state. Its plant numbers are illustrative: a rough stand-in moves them, not the simulator. The limits come from the design basis.

- **A, analog board:** the plate, screws, stencil title, LCD readouts, lens buttons, bezel LEDs and hazard housing come from MC-v2. New are a round pressure gauge with zones, a drum level gauge with zones (the same kind of gauge as the hotwell bar of #54), a continuous gas knob (#15: drag, scroll or arrow keys), an annunciator that flashes until ACK, and a mimic strip.
- **B, DCS screen:** grey and flat, with colour only for abnormal states. It has a pressure trend, process-value bars with normal bands, a gas faceplate and an alarm list with priority shapes.

[0015-full-board-mockup.html](0015-full-board-mockup.html) takes option A to the whole app: a working page with every control and readout of the Boiler, Condenser and Turbine tabs, under a rotary selector that replaces the tabs. It is also published with its tokens and components as [a design system](https://claude.ai/artifact/4DQM2vkJVMQ57jun1KeLtX), whose Board card maps each app element to its place on the board. A rough stand-in moves its numbers too, but its gauge zones and interlocks use the limits in `src/context/const.ts` and the design basis, so the drum level has one zone (burner low-low) instead of the illustrative zones of the first mockup.

- **Added to what the app has:** a gas knob beside the four step buttons (#15), knobs on the valves beside Close and Open, an annunciator with one tile per existing alarm, a mimic strip and a round RPM dial. The ±2 RPM sync band is too narrow to see on the dial, so an LED and a message carry it.
- **Left out of the app:** the placeholder condenser and turbine visuals.
- **Fonts:** Stardos Stencil, Share Tech Mono and IBM Plex Sans Condensed. LiquidCrystal is not used.

## Consequences

- New UI work follows option A. The foundation of the rebuild is #85.
- An overview diagram of all parts of the plant replaces the rotary selector of the full-board mockup: a part with controls can be clicked to open it, a part without controls is shown but can't be clicked. The mockup still shows the selector (#85).
- The open UI tickets build on #85 and are blocked by it: #15 (faster gas control), #24 (start presets), #36 (history visualisation), #41 (continuous-fire valve buttons), #54 (hotwell level zones) and #86 (styled speed control and clock).
- The sim side of a UI idea doesn't wait for the redo: the hotwell alarms (#59) and the time control (#78) are built first, and #85 and #86 give them their board controls.
- The MC-v2 components are copied and adapted into this repo, not shared as a package. The LiquidCrystal font licence must be checked first; Stardos Stencil is OFL.
