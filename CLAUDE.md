# Steamboiler / PowerPlant Simulator

Steam power plant simulator (boiler → turbine → condenser) in React + TypeScript + Vite.
App code lives in `steamboiler-web/` (pnpm). Simulation core is pure functions in
`steamboiler-web/src/context/` (`PowerPlantTick`, `BoilerTick`, `TurbineTick`,
`CondenserTick`), fully decoupled from React.

Project documentation is indexed in `docs/README.md` — read it to find the topic you need.

## Current status (July 2026)

Project is paused. It stalled on a slow feedback loop: every parameter tweak required a
full app startup and a manual power-up sequence to judge the effect.

## Next step: headless scenario runner

**Read `docs/headless runner.md` first** — it is the agreed plan to unblock the project.
Summary: a Node script drives `PowerPlantTick` headless through scripted operator
scenarios (via `PowerPlantReducer` actions), runs a full simulated startup in under a
second, and writes a self-contained `report.html` with time-series charts. Scenario
assertions in vitest then guard the manual-control UX while the physics gets corrected
per `docs/improvements.md` (energy-balance steam generation first).

Do not resume parameter tuning or physics changes before the runner exists.

## Known issues

- One turbine test fails (`electricOutput` expectation in `TurbineTick.test.ts`) — fix
  before trusting the suite as a regression guard.
- Boiler start state is hardcoded warm (`StartTemperature: 250` in `src/context/const.ts`),
  a workaround for the slow feedback loop; the runner plan replaces it with snapshots.

## Commands (run in `steamboiler-web/`)

- `pnpm dev` — run the app
- `pnpm test` — vitest
- `pnpm lint` — eslint + tsc
