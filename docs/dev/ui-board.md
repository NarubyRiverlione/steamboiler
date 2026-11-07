# UI board

The presentation of the analog control-room board. Why: [ADR 0015](../adr/0015-ui-redo-analog-board-preferred.md). Only `src/components/` and `src/navigation/` change for the board; `src/context/` stays as it is.

## Tokens

All in `src/components/board/board.css`, under a `--board-*` prefix so they don't clash with `simulator.css` and `App.css` while both exist. Groups: fonts (`--board-font-stencil`, `-lcd`, `-label`), page and text, plate and panel, screws, LCD (`--board-lcd-*`, with `-alarm` for a value in alarm), LED (`--board-led-off`; lit uses `--board-lcd-alarm`), button (`--board-button-bg`, `--board-button-lit`). Class names carry the same `board-` prefix. Fonts: [fonts.md](fonts.md).

## Primitives

In `src/components/board/`. Each file opens with a comment saying it is adapted from MC-v2 (the `missile-boat-fire-control` repo, `src/ui`). Nothing is copied speculatively: a step copies the primitives it uses.

| Primitive | What |
|---|---|
| `PanelFrame` | Plate, inset panel, stencil title (`h1` or `h2`), four corner screws at fixed angles |
| `Display` | LCD readout (an `<output>` named by its label); red while `alarm` is set |
| `Led` | Round bezel LED for use inside an SVG (an `img` named "<label>: on/off"); red while `lit` |

## Shell and navigation

In `src/navigation/`. `Layout` is the shell of every page: `Header` (breadcrumb, the Plant overview button lit on the overview, and empty slots `data-slot="annunciator" | "clock" | "speed"` for step 6 and #86) above the routed page. There is no tab strip. Pages not yet migrated render below the header with their old styling (`LegacyLayout.css`, removed in #98).

- **Routes** (`AppRoutes`): `/` is `PlantOverview`; `/boiler`, `/condenser`, `/turbine` the detail pages.
- **Keys** (`useBoardKeys`): Page Down or Right and Page Up or Left cycle Boiler, Condenser, Turbine (from the overview: first or last, ends wrap); Esc returns to the overview. A focused button or link keeps the arrows (not Esc); an unknown path redirects to the overview. Ignored with Alt, Ctrl or Meta, and while the focus is in an `input`, `textarea`, `select`, `contenteditable`, `slider` or `spinbutton`, so a knob keeps its arrow keys.
- **Parts** (`plantParts.ts`): the part list (path, name) and `partAlarms`, the alarm flags per part: Boiler `heatingRateOverLimit` or `burnerTripped`, Condenser `condensationPumpTripped`, Turbine `turbineTripped`. A new alarm flag is added there (and gets its annunciator tile in step 6).
- **Overview** (`PlantOverview`): the plant of [ADR 0029](../adr/0029-target-plant.svg) as a static SVG, no live numbers. A node with controls is a `PartNode` link to its page (Boiler: Burner, Boiler, Drain; Turbine: Main steam valve, Turbine valve, Turbine, Bypass valve; Condenser: Condenser, Condensation pump, Recirculation pump, Air extraction pump, SJAE); the part's main node carries an `AlarmLed`. The extraction heater is drawn without a link, the air preheater dashed. When the plant changes, redraw the SVG here too.

## Building a part page

A part page is a `PanelFrame` holding its readouts and controls, each a board primitive fed from the plant state; an action is dispatched through the existing reducer. Copy a primitive from MC-v2 into `src/components/board/` when a page needs it, with its tokens in `board.css`, and a test in the `ui` project ([testing.md](testing.md)) that checks behaviour. Each page is checked by eye against the full-board mockup in the ADR; there is no visual-regression tooling.
