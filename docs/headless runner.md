# Headless Scenario Runner

## Status

Build steps 1–4 are done. `pnpm sim [scenario]` (default `startup-cold`; writes
`sim/reports/<scenario>-<timestamp>.csv` and `.html`, git-ignored) runs a named scenario through `powerPlantReducer`
(`SIMULATE_TICK` + operator actions) and writes sampled boiler/turbine/condenser state as CSV plus
a self-contained HTML report in ~50 ms wall. Code: `sim/scenario.ts` (`Scenario`, `runScenario`,
`firstTimeWhere` for assertions), `sim/csv.ts` (`toCsv`), `sim/report.ts` (`toReportHtml`; the
panel list is the `panels` array), `sim/scenarios/` (one file per scenario, registered in
`index.ts`), `sim/run.ts` (CLI). A scenario's `initial` state is the cold plant from
`makeInitialState()` in `src/context/PowerPlantReducer.ts` (the UI starts there too), or a snapshot
(see **State snapshots**). `tsx` is a dev dependency only.

The report is hand-rolled SVG (no CDN, opens offline). Hovering any panel moves a synced
crosshair across all panels; dashed lines mark operator actions. On a headless machine,
`pnpm sim:serve` serves it on `0.0.0.0:4174` (`PORT` to override) and prints the LAN URLs; the
file is re-read per request, so re-run `pnpm sim` and refresh. `pnpm sim:view` does both.
Note: the app lives at the repo root, so `sim/` is at the root, not under `steamboiler-web/`.

Scenarios (`pnpm sim <name>`); each either replays the earlier operator steps from
`sim/scenarios/steps.ts` from cold, or starts from a snapshot with those steps moved by `since()`:

| Scenario | Starts from | Goal |
| --- | --- | --- |
| `startup-cold` | cold | cold → 10 bar, main steam valve open, turbine valve cracked |
| `heat-up` | cold | cold → 10 bar with vacuum pulled, nothing opened; source of the `at-pressure` snapshot |
| `turbine-start` | `at-pressure` | main steam valve, turbine valve to 25%, turbine rolling |
| `turbine-sync` | cold | more gas, turbine valve full, try the breaker; sync is unreachable today (#18, #21) |
| `cooldown` | cold | at pressure, then natural cooldown for 60 min |
| `bypass-loop` | cold | cold start, bypass only; an operator holds boiler level at 50% and the hotwell at 70% (#19) |

`startup-cold` does not run the water loop: it leaves cooling water and the condensation pump at 0,
so nothing condenses and nothing returns. Use `bypass-loop` for the loop.

A scenario's optional `operator(state, time)` is a feedback hook called every tick after the timed
actions; its actions go through `powerPlantReducer` like any other. It must decide from state and
time alone so runs stay reproducible. `sim/scenarios/loop-operator.ts` is the one in use: it starts
steam (main steam valve, bypass, SJAE restart), nudges the condensation pump toward the boiler level
target and cooling water against condenser steam once a second, and opens makeup or reject on the
hotwell limits with hysteresis. Operator actions are not drawn as dashed lines in the report; the
Loop panels show the valve positions instead.

The report's **Loop** group (every scenario) shows the water inventory with a total that should stay
flat (boundary flows undone), the loop flows in L/s, and the loop valve positions. The water
invariant counts makeup, reject and drain as boundary flows via the totalizers `makeupTotal`,
`rejectTotal` and `drainedTotal`, so they are not flagged as created or lost water.

Goal checks live in `sim/scenario.test.ts`. `sim/invariants.ts` holds the physical invariants
(no NaN, design pressure and temperature, water within capacity, water never created or lost,
natural cooldown never heats and stops steam generation); `sim/invariants.test.ts` checks every
invariant against every registered scenario, one test per pair. A pair that fails today is in its
`expectedFailures` table as a `test.fails` naming the fixing ticket; when that ticket lands the test
turns red, so remove the entry to make the pair a guard.

## Why

The project stalled on its feedback loop: every parameter tweak required a full app
startup, a manual power-up sequence, and minutes of watching gauges to judge the effect.
The fix is already latent in the architecture — `PowerPlantTick(state) => state` is a pure
function with no React dependency. The browser is only involved because the tick loop
happens to live in the React provider. Move the loop into a Node script and a full
simulated startup runs in under a second, with charts instead of gauge-watching.

Target workflow:

```
edit const.ts  →  pnpm sim startup-cold  →  open the newest sim/reports/*.html  →  compare curves
```

Feedback drops from ~15 minutes of manual operation to ~5 seconds.

## What it is

Three pieces, all inside `steamboiler-web`, no server, no new frontend:

### 1. The loop (headless core)

A plain TypeScript script run with `tsx`:

```ts
import PowerPlantTick from "../src/context/PowerPlantTick"

let state: PowerPlantState = makeInitialState() // truly cold: 20°C, not 250°C
const samples: Sample[] = []

for (let tick = 0; tick < scenarioDuration / CstSimulation.DeltaTime; tick++) {
  state = applyScenario(scenario, state, tick) // scripted operator actions
  state = PowerPlantTick(state)
  if (tick % sampleEvery === 0) samples.push(takeSample(state, tick))
}

writeReport(samples, scenario)
```

The UI runs 10 ticks per real second; the script runs the same ticks flat-out
(hundreds of thousands per second). One sim-hour ≈ well under a second of wall time.

### 2. Scenarios (replacing hands on the controls)

Each scenario is a declarative list of timed operator actions — the power-up procedure
encoded once and replayed identically on every run, so parameter comparisons are fair:

```ts
const startupCold: Scenario = {
  name: "startup-cold",
  duration: 3600, // sim-seconds
  actions: [
    { at: 0,    action: { type: "SET_GAS_FLOW", value: 0.6 } },
    { at: 1200, action: { type: "OPEN_MAIN_STEAM_VALVE" } },
    // ramp turbine valve 1%/s, sync generator at rated RPM, ...
  ],
}
```

Preferred mechanism: dispatch the **same action objects through `PowerPlantReducer`**
that the UI dispatches. Scenarios then exercise the exact code path the manual controls
use — which is what makes them a UX regression guard, not just a physics probe.
(Fallback: poke state fields directly, but that bypasses the reducer and guards nothing.)

First scenarios to encode:

- `startup-cold` — heat from 20°C, reach operating pressure
- `startup-hot` — from a "hot standby" snapshot to full load
- `steady-state` — hold at load for a sim-hour; nothing should drift
- `bypass-transient` — open/close bypass at pressure; no unphysical spikes
- `shutdown` — gas off, coast down

### 3. The report (graphs)

The script writes a single **self-contained `report.html`**: sample data embedded as
JSON, small inline charting (hand-rolled SVG or an inlined micro-library — no CDN,
no server). Stacked time-series panels:

- Boiler: temperature, pressure, water volume, steam mass, energy delta
- Turbine: RPM, steam flow (turbine + bypass), electric output
- Condenser: pressure/vacuum, hotwell volume, return rate

Nice-to-have (phase 2): overlay mode — run the same scenario twice with different
constants and plot both runs on the same axes to see exactly what a tweak changed.
Minimal fallback at any point: dump CSV and plot elsewhere.

## Scenario assertions = regression tests

The runner and the test guard are the same machinery — one ends in a chart, the other
in an `expect`. Scenarios dropped into vitest encode the behaviors learned by watching:

```ts
test("cold start reaches 10 bar within 40 sim-minutes", () => {
  const run = runScenario(startupCold)
  expect(run.firstTimeWhere((s) => s.Boiler.pressure >= 10)).toBeLessThan(2400)
})
```

These guard the manual-control UX while the physics model gets corrected: every
improvement from `improvements.md` (energy-balance steam generation first) can then be
made without fear — the scenarios flag immediately what changed.

## State snapshots

Done in #7. A snapshot is a full `PowerPlantState` as plain JSON in `sim/snapshots/<name>.json`,
committed. A scenario starts from one with `initial: loadSnapshot("<name>")` (`sim/snapshot.ts`);
the loader compares the file with the shape of `makeInitialState()` and throws on missing or extra
keys or a wrong type, so a snapshot from an older state shape fails loudly instead of running.

- `pnpm sim <scenario> --snapshot <name>` writes the run's final state to
  `sim/snapshots/<name>.json` (ad hoc).
- Committed snapshots are listed in `sim/snapshot-sources.ts` with the scenario whose final state
  they are; `pnpm sim:snapshots` regenerates them all. `sim/snapshot.test.ts` fails when a committed
  file no longer matches a fresh run of its source, so after a physics or state change: run
  `pnpm sim:snapshots`, look at the diff, commit.
- `at-pressure` is the end of `heat-up` (t = 720 s, ~11.6 bar). `turbine-start` starts from it, and
  a test checks that this gives exactly the same states as replaying the cold start.

UI presets ("cold", "hot standby", "at pressure") are #24; the UI starts cold.

## Proposed layout

```
steamboiler-web/
  sim/
    run.ts              // CLI entry: pnpm sim <scenario> [--snapshot name]
    scenario.ts         // Scenario type + applyScenario + runScenario
    scenarios/
      startup-cold.ts
      steady-state.ts
      ...
    report.ts           // samples -> self-contained report.html
    snapshots/          // saved PowerPlantState JSON (done, #7)
  src/context/...       // untouched simulation core
```

`package.json`: add `"sim": "tsx sim/run.ts"` and dev-dependency `tsx`.

## Build order

1. **Loop + CSV** — `run.ts` driving `PowerPlantTick` with a hardcoded scenario,
   samples to CSV. Proves the core runs headless. (~1 hour)
2. **Reducer-driven scenarios** — `Scenario` type, `applyScenario` via
   `PowerPlantReducer`, `startup-cold` encoded. (~1–2 hours)
3. **HTML report** — self-contained `report.html` with time-series panels. (~2 hours)
4. **First assertions** — scenario goals and invariants in vitest (done, #6).
5. **Snapshots + overlay mode** — snapshots done (#7); UI presets (#24) and A/B comparison runs
   later, as needed.

Steps 1–4 are roughly an afternoon. After step 4 the project is unblocked: parameter
tuning is cheap, the UX is guarded, and the physics corrections in `improvements.md`
become safe to attempt.

## Known wrinkles

- Driving `PowerPlantReducer` from Node works (verified in step 2).
- Scenario actions are timed, not conditional: an action the reducer refuses (e.g.
  `TOGGLE_MAIN_STEAM_VALVE` below 10 bar) is silently a no-op. Assert the effect in tests.
