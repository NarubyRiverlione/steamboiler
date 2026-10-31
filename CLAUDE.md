# Steamboiler / PowerPlant Simulator

React + TypeScript + Vite; app at the repo root (pnpm), there is no `steamboiler-web/` directory.
Simulation core is pure functions in `src/context/` (`PowerPlantTick`, `BoilerTick`, `TurbineTick`,
`CondenserTick`), decoupled from React. Docs index: `docs/README.md`; follow the rules at its top.

## Rules

- **Realism**: never add a magic number to speed up a process; playability comes from sizing utilities.
  Record every over-dimensioned utility or deliberate reduction in `docs/plant/design-basis.md`.
- Judge physics/parameter changes with the headless runner (`docs/dev/headless-runner.md`), not the app.
- A change to the plant or code updates its reference doc in `docs/plant/` or `docs/dev/` in the same commit.
- A decision gets an ADR in `docs/adr/`.

## Commands

- `pnpm test` · `pnpm lint` (eslint + tsc)
- `pnpm sim [scenario]` — headless run, writes CSV + HTML to `sim/reports/`
- `pnpm sim:snapshots` — regenerate `sim/snapshots/` (a test fails when stale)
- `pnpm roadmap` — regenerate `ROADMAP.md` from GitHub issues

## Tickets

GitHub Issues (`NarubyRiverlione/steamboiler`) via `gh`; labels and domain docs in `docs/agents/`.
Work in `ROADMAP.md` order: first `ready-*` ticket under **Next up**. New tickets get a `P1`–`P3` label
and blocked-by links. After creating or closing one, run `pnpm roadmap` and commit `ROADMAP.md`.
Before closing, run the `crap-score-typescript` skill on the changed files, report the scores (also in
the closing comment) and flag any method above the risk threshold.
