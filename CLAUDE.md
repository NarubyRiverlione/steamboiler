# Steamboiler / PowerPlant Simulator

Steam power plant simulator (boiler → turbine → condenser) in React + TypeScript + Vite.
App code lives at the repo root (pnpm); there is no `steamboiler-web/` directory. Simulation core is pure functions in
`src/context/` (`PowerPlantTick`, `BoilerTick`, `TurbineTick`,
`CondenserTick`), fully decoupled from React.

Project documentation is indexed in `docs/README.md` — read it to find the topic you need.

## Realism rule

Physics must be realistic: never add a magic number to speed up a process. Playability comes
from over-dimensioning utilities (gas flow, pump volumes). Record every over-dimensioned utility
in the register in `README.md` ("Over-dimensioned utilities").

## Current status (July 2026)

Project is paused. It stalled on a slow feedback loop: every parameter tweak required a
full app startup and a manual power-up sequence to judge the effect.

## Next step: headless scenario runner

**Read `docs/headless runner.md` first** — it is the agreed plan to unblock the project.
Summary: a Node script drives `PowerPlantTick` headless through scripted operator
scenarios (via `PowerPlantReducer` actions), runs a full simulated startup in under a
second, and writes a self-contained HTML report with time-series charts. Scenario
assertions in vitest then guard the manual-control UX while the physics gets corrected
per `docs/improvements.md` (energy-balance steam generation first).

Do not resume parameter tuning or physics changes before the runner exists.

## Known issues

Tracked in `docs/known-issues.md`.

## Commands (run at the repo root)

- `pnpm dev` — run the app (vite `--host`: reachable on the LAN)
- `pnpm test` — vitest
- `pnpm sim [scenario]` — headless runner, writes `sim/reports/<scenario>-<timestamp>.csv` + self-contained `.html` report (see `docs/headless runner.md`)
- `pnpm sim:snapshots` — regenerate the committed start-state snapshots in `sim/snapshots/` (a test fails when they are stale)
- `pnpm sim:serve [report.html]` — serve the newest report in `sim/reports/` on the LAN (`PORT`, default 4174); `pnpm sim:view` = run + serve
- `pnpm lint` — eslint + tsc
- `pnpm roadmap` — regenerate `ROADMAP.md` (ticket order) from the GitHub issues

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues (`NarubyRiverlione/steamboiler`) via the `gh` CLI. See `docs/agents/issue-tracker.md`.

`ROADMAP.md` is the order to work in; pick the first ticket under **Next up** that is `ready-*`.
When creating a ticket, give it a `P1`/`P2`/`P3` label and blocked-by links. After creating or
closing a ticket, run `pnpm roadmap` and commit `ROADMAP.md`.

Before closing a ticket, run the `crap-score-typescript` skill on the files the ticket changed
and report the CRAP scores to the user (and in the closing comment). Flag any method above the
skill's risk threshold before closing.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
