# UI board

The presentation of the analog control-room board. Why: [ADR 0015](../adr/0015-ui-redo-analog-board-preferred.md). Only `src/components/` and `src/navigation/` change for the board; `src/context/` stays as it is.

## Tokens

All in `src/components/board/board.css`, under a `--board-*` prefix so they don't clash with `simulator.css` and `App.css` while both exist. Groups: fonts (`--board-font-stencil`, `-lcd`, `-label`), page and text, plate and panel, screws, LCD (`--board-lcd-*`, with `-alarm` for a value in alarm). Class names carry the same `board-` prefix. Fonts: [fonts.md](fonts.md).

## Primitives

In `src/components/board/`. Each file opens with a comment saying it is adapted from MC-v2 (the `missile-boat-fire-control` repo, `src/ui`). Nothing is copied speculatively: a step copies the primitives it uses.

| Primitive | What |
|---|---|
| `PanelFrame` | Plate, inset panel, stencil title (`h1` or `h2`), four corner screws at fixed angles |
| `Display` | LCD readout (an `<output>` named by its label); red while `alarm` is set |

## Building a part page

A part page is a `PanelFrame` holding its readouts and controls, each a board primitive fed from the plant state; an action is dispatched through the existing reducer. Copy a primitive from MC-v2 into `src/components/board/` when a page needs it, with its tokens in `board.css`, and a test in the `ui` project ([testing.md](testing.md)) that checks behaviour. Each page is checked by eye against the full-board mockup in the ADR; there is no visual-regression tooling.
