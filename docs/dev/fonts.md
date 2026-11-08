# Fonts

Self-hosted woff2 files in `src/assets/fonts/`, declared in `src/components/board/board.css`. No network calls. Why these fonts: [ADR 0015](../adr/0015-ui-redo-analog-board-preferred.md).

| Font | Used for | Files | Licence |
|---|---|---|---|
| Stardos Stencil (Vernon Adams) | Panel titles | latin 400, 700 | SIL OFL 1.1 |
| Share Tech Mono (Carrois Type Design) | LCD readouts | latin 400 | SIL OFL 1.1 |
| IBM Plex Sans Condensed (IBM Corp.) | Labels | latin 400, 700 | SIL OFL 1.1 |

The OFL permits bundling and use in software; the licence text must travel with the fonts, so each font's text sits next to its files as `<font>-OFL.txt`. LiquidCrystal (used by MC-v2) is not used here.

Source: the woff2 files and licence texts are from the `@fontsource/*` packages (v5.3.0), downloaded once and copied; the packages are not dependencies. Only the latin subset is bundled. A new weight or subset is copied the same way.
