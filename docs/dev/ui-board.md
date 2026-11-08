# UI board

The presentation of the analog control-room board. Why: [ADR 0015](../adr/0015-ui-redo-analog-board-preferred.md). Only `src/components/` and `src/navigation/` change for the board; `src/context/` stays as it is.

## Tokens

All in `src/components/board/board.css`, under a `--board-*` prefix so they can't clash with other styles. `board.css` also holds the page base (border-box sizing, `body` margin and floor colour). Groups: fonts (`--board-font-stencil`, `-lcd`, `-label`), page and text, plate and panel, screws, LCD (`--board-lcd-*`, with `-alarm` for a value in alarm), LED (`--board-led-off`; lit uses `--board-lcd-alarm`), lens button (`--board-lens-*`), mimic (`--board-mimic-*`, one per medium). Class names carry the same `board-` prefix. Fonts: [fonts.md](fonts.md).

## Primitives

In `src/components/board/`. Each file opens with a comment saying it is adapted from MC-v2 (the `missile-boat-fire-control` repo, `src/ui`). Nothing is copied speculatively: a step copies the primitives it uses.

| Primitive | What |
|---|---|
| `PanelFrame` | Plate, inset panel, stencil title (`h1` or `h2`), four corner screws at fixed angles |
| `Display` | LCD readout (an `<output>` named by its label); red while `alarm` is set |
| `Screws` | The four corner screws at fixed angles; used by `PanelFrame` and `Header` |
| `Led` | Round bezel LED for use inside an SVG (an `img` named "<label>: on/off"); red while `lit` |
| `Lamp` | `Led` in its own SVG with a text label, for use in HTML |
| `LensButton` | Illuminated button; lit while `pressed` (`aria-pressed`); `disabled` dims it, `title` carries the reason |
| `RoundGauge` | Round dial (`role="meter"`) with a needle and zones (`ok`, `warn`, `alarm`) |
| `LevelGauge` | Vertical level gauge in percent (`role="meter"`) with a zone strip and a pointer |
| `ValveControl` | Close and Open lens buttons around a bar (`role="meter"`), position on an LCD; props `cbAdjust(±Step/100)`. Used by the Condenser and Turbine pages; #41 adds the knob |

## Shell and navigation

In `src/navigation/`. `Layout` is the shell of every page: `Header` (a plate like the part pages: the `h1` "Powerplant Simulation", a lens button "Plant overview" lit on the overview, the breadcrumb, the annunciator in `data-slot="annunciator"`, and empty slots `data-slot="clock" | "speed"` for #86) above the routed page. There is no tab strip. The shell is the board floor (`--board-page-bg`, #2b2e31) with the plates on it. Every page is a board page; no old UI code or CSS is left (#98).

- **Routes** (`AppRoutes`): `/` is `PlantOverview`; `/boiler`, `/condenser`, `/turbine` the detail pages.
- **Keys** (`useBoardKeys`): Page Down or Right and Page Up or Left cycle Boiler, Condenser, Turbine (from the overview: first or last, ends wrap); Esc returns to the overview. A focused button or link keeps the arrows (not Esc); an unknown path redirects to the overview. Ignored with Alt, Ctrl or Meta, and while the focus is in an `input`, `textarea`, `select`, `contenteditable`, `slider` or `spinbutton`, so a knob keeps its arrow keys.
- **Parts** (`plantParts.ts`): the part list (path, name) and `partAlarms`, the alarm flags per part, derived from `alarms.ts` (below); a new alarm flag is added there and gets its annunciator tile.
- **Annunciator** (`Annunciator`, in the header): one tile per alarm flag, listed in `alarms.ts` (id, label, owning part, flag): Heating rate over limit and Burner trip (Boiler), Condensation pump trip (Condenser), Turbine trip (Turbine). The hotwell tiles come with #59, others with #62 and #72. A tile lights from its flag and flashes (`board-tile-flash`, slower under `prefers-reduced-motion`) until ACK; ACK stops the flashing but not the trip, so the tile stays lit while the flag is set; when the flag clears the acknowledgement is forgotten and the next trip flashes again. TEST lights every tile (no flashing) while it is held (pointer, Space or Enter). A tile is a button that opens the part that owns the alarm. The state (acknowledged ids, TEST) lives in `AnnunciatorProvider` / `useAnnunciator` in `src/navigation/`, a React context wrapped by `Layout` that reads the plant state; nothing under `src/context/` changes. Tokens: `--board-tile-*`, `--board-annun-well`.
- **Overview** (`PlantOverview`, data in `plantDiagram.ts`): the plant of [ADR 0029](../adr/0029-target-plant.svg), laid out as in the full-board mockup, as a static SVG with no live numbers. A node with a `part` is a link to that page and drawn raised (Boiler: Burner, Boiler, Drain; Turbine: Main steam valve, Turbine valve, Turbine, Generator, Bypass valve; Condenser: Condenser, pumps, SJAE, Hotwell); the node marked `led` carries the part's alarm LED. The other nodes are flat; the extraction heater has no controls, the air preheater is dashed. When the plant changes, change `plantDiagram.ts` too.

## Boiler page

`src/components/Boiler/Boiler.tsx`, one `PanelFrame`: the pressure `RoundGauge` (0 to 200 bar; green to `ValveRatingPressure`, orange to `ReliefOpenPressure`, red above), the gas controls (four `LensButton` steps of `GasChangeRateFast` and `-Slow`; the knob is #15), the drum `LevelGauge` (one red zone below `BurnerLowLowLevel`) with the drain valve button, then the status readouts as `Display`s with `Lamp`s for heating rate over limit, relief valve open and burner tripped, then the stack temperature and boiler efficiency (#89), and an Advanced `<details>`. The pressure and the energy change are smoothed with `useEMA`, as before.

## Condenser page

`src/components/Condenser/Condenser.tsx`, one `PanelFrame`: the pressure `RoundGauge` (0 to 1100 mbar, so atmospheric is on the dial; green within `OptimalPressureBellWidth` of `OptimalPressure`, orange outside the band up to `VacuumLimit`, red above, where the turbine trips) with High and Low `Lamp`s, the pressure controls (air extraction pump and SJAE `LensButton`s, SJAE `ValveControl`), the hotwell `LevelGauge` (no zones yet, #54), a `ValveControl` each for the recirculation pump, condensation pump, makeup and reject (flow rates as before), then the status readouts as `Display`s (steam volume, hotwell temperature, intake and return flow). Smoothed with `useEMA`, as before.

## Turbine page

`src/components/Turbine/Turbine.tsx`, one `PanelFrame`: the speed `RoundGauge` (0 to `MaxRPM`; green to 105% of `SyncRPM`, orange above) with an LCD and an "In sync band" `Lamp` (lit within `BreakerRPMMargin` of `SyncRPM`: the ±2 RPM band is too narrow to see on the dial), the speed mode and run-up point `LensButton`s (lit when selected, disabled with the refusal as `title`), the generator breaker `LensButton` (disabled while open and out of the sync band, with a message saying the band and the current RPM), the load setpoint `input` (disabled with the refusal shown while the breaker is open; applied on Enter or blur), the main steam valve `LensButton` with an "Opening not possible" `Lamp`, a `ValveControl` each for the bypass and turbine valves, then the status readouts as `Display`s with a "Turbine trip" `Lamp`. The steam flow is smoothed with `useEMA`, as before.

## Building a part page

A part page is a `PanelFrame` holding its readouts and controls, each a board primitive fed from the plant state; an action is dispatched through the existing reducer. Copy a primitive from MC-v2 into `src/components/board/` when a page needs it, with its tokens in `board.css`, and a test in the `ui` project ([testing.md](testing.md)) that checks behaviour. Each page is checked by eye against the full-board mockup in the ADR; there is no visual-regression tooling.
