# UI board

The presentation of the analog control-room board. Why: [ADR 0015](../adr/0015-ui-redo-analog-board-preferred.md). Only `src/components/` and `src/navigation/` change for the board; `src/context/` stays as it is.

## Tokens

All in `src/components/board/board.css`, under a `--board-*` prefix so they don't clash with `simulator.css` and `App.css` while both exist. Groups: fonts (`--board-font-stencil`, `-lcd`, `-label`), page and text, plate and panel, screws, LCD (`--board-lcd-*`, with `-alarm` for a value in alarm), LED (`--board-led-off`; lit uses `--board-lcd-alarm`), lens button (`--board-lens-*`), mimic (`--board-mimic-*`, one per medium). Class names carry the same `board-` prefix. Fonts: [fonts.md](fonts.md).

## Primitives

In `src/components/board/`. Each file opens with a comment saying it is adapted from MC-v2 (the `missile-boat-fire-control` repo, `src/ui`). Nothing is copied speculatively: a step copies the primitives it uses.

| Primitive | What |
|---|---|
| `PanelFrame` | Plate, inset panel, stencil title (`h1` or `h2`), four corner screws at fixed angles |
| `Display` | LCD readout (an `<output>` named by its label); red while `alarm` is set |
| `Screws` | The four corner screws at fixed angles; used by `PanelFrame` and `Header` |
| `Led` | Round bezel LED for use inside an SVG (an `img` named "<label>: on/off"); red while `lit` |
| `Lamp` | `Led` in its own SVG with a text label, for use in HTML |
| `LensButton` | Illuminated button; lit while `pressed` (`aria-pressed`) |
| `RoundGauge` | Round dial (`role="meter"`) with a needle and zones (`ok`, `warn`, `alarm`) |
| `LevelGauge` | Vertical level gauge in percent (`role="meter"`) with a zone strip and a pointer |
| `ValveControl` | Close and Open lens buttons around a bar (`role="meter"`), position on an LCD; props of the old `ValveSlider`, `cbAdjust(±Step/100)`. Used by the Condenser and Turbine pages until their own steps; #41 adds the knob |

## Shell and navigation

In `src/navigation/`. `Layout` is the shell of every page: `Header` (a plate like the part pages: the `h1` "Powerplant Simulation", a lens button "Plant overview" lit on the overview, the breadcrumb, and empty slots `data-slot="clock" | "speed" | "annunciator"` for #86 and step 6) above the routed page. There is no tab strip. The shell is the board floor (`--board-page-bg`, #2b2e31) with the plates on it. Pages not yet migrated render below the header with their old styling, in a light `LegacyPage` card so they stay readable on the floor (`LegacyLayout.css` and `LegacyPage`, removed in #98).

- **Routes** (`AppRoutes`): `/` is `PlantOverview`; `/boiler`, `/condenser`, `/turbine` the detail pages.
- **Keys** (`useBoardKeys`): Page Down or Right and Page Up or Left cycle Boiler, Condenser, Turbine (from the overview: first or last, ends wrap); Esc returns to the overview. A focused button or link keeps the arrows (not Esc); an unknown path redirects to the overview. Ignored with Alt, Ctrl or Meta, and while the focus is in an `input`, `textarea`, `select`, `contenteditable`, `slider` or `spinbutton`, so a knob keeps its arrow keys.
- **Parts** (`plantParts.ts`): the part list (path, name) and `partAlarms`, the alarm flags per part: Boiler `heatingRateOverLimit` or `burnerTripped`, Condenser `condensationPumpTripped`, Turbine `turbineTripped`. A new alarm flag is added there (and gets its annunciator tile in step 6).
- **Overview** (`PlantOverview`, data in `plantDiagram.ts`): the plant of [ADR 0029](../adr/0029-target-plant.svg), laid out as in the full-board mockup, as a static SVG with no live numbers. A node with a `part` is a link to that page and drawn raised (Boiler: Burner, Boiler, Drain; Turbine: Main steam valve, Turbine valve, Turbine, Generator, Bypass valve; Condenser: Condenser, pumps, SJAE, Hotwell); the node marked `led` carries the part's alarm LED. The other nodes are flat; the extraction heater has no controls, the air preheater is dashed. When the plant changes, change `plantDiagram.ts` too.

## Boiler page

`src/components/Boiler/Boiler.tsx`, one `PanelFrame`: the pressure `RoundGauge` (0 to 200 bar; green to `ValveRatingPressure`, orange to `ReliefOpenPressure`, red above), the gas controls (four `LensButton` steps of `GasChangeRateFast` and `-Slow`; the knob is #15), the drum `LevelGauge` (one red zone below `BurnerLowLowLevel`) with the drain valve button, then the status readouts as `Display`s with `Lamp`s for heating rate over limit, relief valve open and burner tripped, and an Advanced `<details>`. The pressure and the energy change are smoothed with `useEMA`, as before. The page is not wrapped in `LegacyPage`.

## Building a part page

A part page is a `PanelFrame` holding its readouts and controls, each a board primitive fed from the plant state; an action is dispatched through the existing reducer. Copy a primitive from MC-v2 into `src/components/board/` when a page needs it, with its tokens in `board.css`, and a test in the `ui` project ([testing.md](testing.md)) that checks behaviour. Each page is checked by eye against the full-board mockup in the ADR; there is no visual-regression tooling.
