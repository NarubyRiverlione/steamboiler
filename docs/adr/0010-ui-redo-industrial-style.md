# A UI redo in an industrial style (proposed, not decided)

**Status: proposed.** This ADR records two ideas for the website's look. Neither is chosen. When one is, a new ADR records that choice and supersedes this one.

The work so far went to the physics on purpose: it is the core of the simulator. No `P1` tickets remain and only two `P2` (#33, and #18 behind #25). The headless runner (`pnpm sim`, [dev/headless-runner.md](../dev/headless-runner.md)) made that work possible: every physics and parameter change is judged on its report, not in the app, and before it existed the project was stuck. With the physics in this state, the website's UI and UX are the next thing to think about, possibly as a complete redo of the site in an industrial style: panels, readouts, knobs.

A redo replaces only the presentation (`src/components/`, `src/navigation/`). The simulation core (`src/context/`, `src/utils/`, the reducer and the tick) is decoupled from React, so the headless runner, the snapshots and the physics stay as they are.

## Considered options

- **Analog control-room board (1960s to 80s), with MC-v2 as inspiration:** a grey enamel panel with round gauges and red arcs, level gauges with zones, rotary knobs, guarded toggle switches, annunciator tiles that flash until acknowledged, and a mimic diagram of the piping. The local reboot of the missile-boat project ([missile-boat-fire-control](https://github.com/NarubyRiverlione/missile-boat-fire-control), `~/Development-Eigen/MC-v2`) already has the visual language: `PanelFrame` (plate, inset panel, screws, stencil title, itself described as "Powerplant-style"), an LCD `Display`, a bezel `Led`, an illuminated `Button`, a rotary `Selector`, a hazard-striped housing, the `console.css` tokens and bundled fonts, all pure SVG and CSS. The steamboiler would add a round gauge, a level gauge, a continuous knob, a toggle or breaker switch, annunciator tiles, a mimic diagram and possibly a strip-chart recorder. Smaller and older plants were run from boards like this, so it fits the realism rule.
- **Modern DCS screen (ISA-101 high-performance HMI):** a deliberately grey, flat screen where colour marks only abnormal states and trends carry most of the information. This is how plants are run today, but it has no knobs and no skeuomorphic controls.

## Consequences

- Nothing is built until a style is chosen. A static mockup of one panel (the Boiler) can be made first to help the choice.
- Whichever style is chosen, the open UI tickets fold into it: #54 (hotwell level zones), #41 (continuous-fire valve buttons), #24 (start presets) and #36 (history visualisation).
- If the MC-v2 language is used, its components are copied and adapted into this repo, not shared as a package. The LiquidCrystal font licence must be checked first; Stardos Stencil is OFL.
