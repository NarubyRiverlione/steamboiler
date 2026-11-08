# UI board

The presentation of the analog control-room board. Why: [ADR 0015](../adr/0015-ui-redo-analog-board-preferred.md). Only `src/components/` and `src/navigation/` change for the board; `src/context/` stays as it is.

## Tokens

All in `src/components/board/board.css`, under a `--board-*` prefix so they can't clash with other styles. `board.css` also holds the page base (border-box sizing, `body` margin and floor colour). Groups: fonts (`--board-font-stencil`, `-lcd`, `-label`), page and text, plate and panel, screws, LCD (`--board-lcd-*`, with `-alarm` for a value in alarm), LED (`--board-led-off`; lit uses `--board-lcd-alarm`), lens button (`--board-lens-*`), mimic (`--board-mimic-*`, one per medium). Class names carry the same `board-` prefix. Fonts: [fonts.md](fonts.md).

## Primitives

In `src/components/board/`. Each file opens with a comment saying it is adapted from MC-v2 (the `missile-boat-fire-control` repo, `src/ui`). Nothing is copied speculatively: a step copies the primitives it uses.

| Primitive | What |
|---|---|
| `PanelFrame` | Plate, inset panel, stencil title (`h1` or `h2`), four corner screws at fixed angles |
| `Display` | LCD readout (an `<output>` named by its label); red while `alarm` is set; `widest` is the longest text it can show, and the box keeps that width (right-aligned) so it does not resize as the value changes. Every LCD on the pages has one, sized from the peaks of the headless runs plus headroom |
| `Screws` | The four corner screws at fixed angles; used by `PanelFrame` and `Header` |
| `Led` | Round bezel LED for use inside an SVG (an `img` named "<label>: on/off"); red while `lit` |
| `Lamp` | `Led` in its own SVG with a text label, for use in HTML |
| `LensButton` | Illuminated button; lit while `pressed` (`aria-pressed`); `disabled` dims it, `title` carries the reason; `widest` is the longest label it can show, so a button that flips (Open and Closed) does not resize |
| `RoundGauge` | Round dial (`role="meter"`) with a needle and zones (`ok`, `warn`, `alarm`) |
| `LevelGauge` | Vertical level gauge in percent (`role="meter"`) with a zone strip and a pointer |
| `ValveControl` | Close and Open lens buttons around a bar (`role="meter"`), position on an LCD; props `cbAdjust(±Step/100)`. Used by the Condenser and Turbine pages; #41 adds the knob |

## Shell and navigation

In `src/navigation/`. `Layout` is the shell of every page: `Header` (a plate like the part pages: the `h1` "Powerplant Simulation", a lens button "Plant overview" lit on the overview, the breadcrumb (the name of the open page, centred; the button is the way back to the overview), the **Presets** button at the right of the nav row, the annunciator in `data-slot="annunciator"`, and empty slots `data-slot="clock" | "speed"` for #86) above the routed page. There is no tab strip. The header is fixed: the shell is one screen tall (`.board-shell`, `height: 100vh`) and only `main.board-main` below it scrolls. The shell is the board floor (`--board-page-bg`, #2b2e31) with the plates on it. Every page is a board page; no old UI code or CSS is left (#98).

- **Routes** (`AppRoutes`): `/` is `PlantOverview`; `/boiler`, `/condenser`, `/turbine` the detail pages.
- **Keys** (`useBoardKeys`): Page Down or Right and Page Up or Left cycle Boiler, Condenser, Turbine (from the overview: first or last, ends wrap); Esc returns to the overview. A focused button or link keeps the arrows (not Esc); an unknown path redirects to the overview. Ignored with Alt, Ctrl or Meta, and while the focus is in an `input`, `textarea`, `select`, `contenteditable`, `slider` or `spinbutton`, so a knob keeps its arrow keys.
- **Parts** (`plantParts.ts`): the part list (path, name) and `partAlarms`, the alarm flags per part, derived from `alarms.ts` (below); a new alarm flag is added there and gets its annunciator tile.
- **Presets** (`PresetsButton`, in the header nav row): a lens button that opens a modal popup (`role="dialog"`, `aria-modal`) listing the start states of `START_PRESETS` (`src/context/startPresets.ts`): Cold & dark (`makeInitialState()`), Hot standby (the `bypass-loop` snapshot) and At pressure (the `turbine-runup` snapshot). Choosing one dispatches `LOAD_STATE` (the reducer returns the payload as the whole new state), clears the annunciator acknowledgements (`clearAcknowledgements`) and closes the popup; there is no confirmation. Close button, Escape and a click on the backdrop close it without touching the plant. Focus moves into the popup, Tab wraps inside it and focus returns to the button on close. While it is open, Esc and Page Up/Down are handled by the popup and do not navigate (`useBoardKeys` honours `defaultPrevented`). The snapshots are imported as JSON through Vite from `sim/snapshots/` (`resolveJsonModule`) and checked with `shapeErrors` (`src/utils/stateShape.ts`, shared with the runner) so a stale snapshot throws instead of loading. The app still starts cold. The clock, speed and Graphs-history resets of #78 and #36 join `LOAD_STATE` handling when those tickets land.
- **Annunciator** (`Annunciator`, in the header): the tiles with ACK above TEST in a column beside them, one tile per alarm flag, listed in `alarms.ts` (id, label, owning part, flag): Heating rate over limit and Burner trip (Boiler), Condensation pump trip (Condenser), Turbine trip (Turbine). The hotwell tiles come with #59, others with #62 and #72. A tile lights from its flag and flashes (`board-tile-flash`, slower under `prefers-reduced-motion`) until ACK; ACK stops the flashing but not the trip, so the tile stays lit while the flag is set; when the flag clears the acknowledgement is forgotten and the next trip flashes again. TEST lights every tile (no flashing) while it is held (pointer, Space or Enter). A tile is a button that opens the part that owns the alarm. The state (acknowledged ids, TEST) lives in `AnnunciatorProvider` / `useAnnunciator` in `src/navigation/`, a React context wrapped by `Layout` that reads the plant state; nothing under `src/context/` changes. Tokens: `--board-tile-*`, `--board-annun-well`.
- **Overview** (`PlantOverview`, data in `plantDiagram.ts`): the plant of [ADR 0029](../adr/0029-target-plant.svg), laid out as in the full-board mockup, as a static SVG with no live numbers. A node with a `part` is a link to that page and drawn raised (Boiler: Burner, Boiler, Drain; Turbine: Main steam valve, Turbine valve, Turbine, Generator, Bypass valve; Condenser: Condenser, pumps, SJAE, Hotwell); the node marked `led` carries the part's alarm LED. The other nodes are flat; the extraction heater has no controls, the air preheater is dashed. When the plant changes, change `plantDiagram.ts` too.

## Boiler page

`src/components/Boiler/Boiler.tsx`, one `PanelFrame`: the pressure `RoundGauge` (0 to 200 bar; green to `ValveRatingPressure`, orange to `ReliefOpenPressure`, red above), the gas controls (four `LensButton` steps of `GasChangeRateFast` and `-Slow`; the knob is #15), the drum `LevelGauge` (one red zone below `BurnerLowLowLevel`) with the drain valve button, then the status readouts as `Display`s with `Lamp`s for heating rate over limit, relief valve open and burner tripped, then the stack temperature and boiler efficiency (#89), and an Advanced `<details>`. The pressure and the energy change are smoothed with `useEMA`, as before.

## Condenser page

`src/components/Condenser/Condenser.tsx`, one `PanelFrame`: the pressure `RoundGauge` (0 to 1100 mbar, so atmospheric is on the dial; green within `OptimalPressureBellWidth` of `OptimalPressure`, orange outside the band up to `VacuumLimit`, red above, where the turbine trips) with High and Low `Lamp`s, the pressure controls (air extraction pump and SJAE `LensButton`s, SJAE `ValveControl`), the hotwell `LevelGauge` (no zones yet, #54), a `ValveControl` each for the recirculation pump, condensation pump, makeup and reject (flow rates as before), then the status readouts as `Display`s (steam volume, hotwell temperature, intake and return flow). Smoothed with `useEMA`, as before.

## Turbine page

`src/components/Turbine/Turbine.tsx`, one `PanelFrame`: the speed `RoundGauge` (0 to `MaxRPM`; green to 105% of `SyncRPM`, orange above) with an LCD and an "In sync band" `Lamp` (lit within `BreakerRPMMargin` of `SyncRPM`: the ±2 RPM band is too narrow to see on the dial), the speed mode and run-up point `LensButton`s (lit when selected, disabled with the refusal as `title`), the generator breaker `LensButton` (disabled while open and out of the sync band, with a message saying the band and the current RPM), the load setpoint `input` (disabled with the refusal shown while the breaker is open; applied on Enter or blur), the main steam valve `LensButton` with an "Opening not possible" `Lamp`, a `ValveControl` each for the bypass and turbine valves, then the status readouts as `Display`s with a "Turbine trip" `Lamp`. The steam flow is smoothed with `useEMA`, as before.

## Building a part page

A part page is a `PanelFrame` holding its readouts and controls, each a board primitive fed from the plant state; an action is dispatched through the existing reducer. Copy a primitive from MC-v2 into `src/components/board/` when a page needs it, with its tokens in `board.css`, and a test in the `ui` project ([testing.md](testing.md)) that checks behaviour. Each page is checked by eye against the full-board mockup in the ADR; there is no visual-regression tooling.

The status panel is a grid of rows (`.board-readouts` > `.board-readout`): a label in a fixed-width column (10.5 rem) and the value right after it, so a value never sits closer to the next column's label than to its own. Give every LCD and every button whose text changes a `widest`, so nothing resizes while the plant runs.

The Boiler status panel uses three fixed columns (`.board-readouts-cols` > `.board-readout-col`): temperature and energy change; stack temperature, boiler efficiency and burner trip; heating rate and relief valve. The last two put the label above, with the lamp and the LCD side by side below it (`.board-readout-stacked`).
