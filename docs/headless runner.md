# Headless Scenario Runner

## Status

Build steps 1–2 are done. `pnpm sim [scenario] [out.csv]` (default `startup-cold`,
`sim-out.csv`, git-ignored) runs a named scenario through `powerPlantReducer`
(`SIMULATE_TICK` + operator actions) and writes sampled boiler/turbine/condenser state as CSV
in ~50 ms wall. Code: `sim/scenario.ts` (`Scenario`, `runScenario`), `sim/csv.ts` (`toCsv`),
`sim/scenarios/` (one file per scenario, registered in `index.ts`), `sim/run.ts` (CLI). A
scenario's `initial` state comes from `makeInitialState(temperature)` in
`src/context/PowerPlantReducer.ts`; `startup-cold` uses 20°C. `tsx` is a dev dependency only.
Note: the app lives at the repo root, so `sim/` is at the root, not under `steamboiler-web/`.

`startup-cold` stops at "turbine valve cracked": the current physics cannot reach generator
sync from cold (see [known-issues.md](known-issues.md)). Its vitest checks guard only what
works today: 10 bar before 720 s, main steam valve opens, turbine turns, no NaN/Infinity.

## Why

The project stalled on its feedback loop: every parameter tweak required a full app
startup, a manual power-up sequence, and minutes of watching gauges to judge the effect.
The fix is already latent in the architecture — `PowerPlantTick(state) => state` is a pure
function with no React dependency. The browser is only involved because the tick loop
happens to live in the React provider. Move the loop into a Node script and a full
simulated startup runs in under a second, with charts instead of gauge-watching.

Target workflow:

```
edit const.ts  →  pnpm sim startup-cold  →  open report.html  →  compare curves
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
    { at: 0,    action: { type: "SET_FILL_VALVE", open: true } },
    { at: 300,  action: { type: "SET_FILL_VALVE", open: false } },
    { at: 300,  action: { type: "SET_GAS_FLOW", value: 0.6 } },
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

- `startup-cold` — fill from empty, heat from 20°C, reach operating pressure
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

Serialize `PowerPlantState` to JSON at any point in a run. Uses:

- `startup-hot` and other scenarios start from a saved snapshot instead of replaying
  a full cold start
- The UI later loads the same presets ("cold", "hot standby", "at pressure") so manual
  sessions start where wanted — and the `StartTemperature: 250` hack in `const.ts`
  can go back to 20

## Proposed layout

```
steamboiler-web/
  sim/
    run.ts              // CLI entry: pnpm sim <scenario> [--out report.html]
    scenario.ts         // Scenario type + applyScenario + runScenario
    scenarios/
      startup-cold.ts
      steady-state.ts
      ...
    report.ts           // samples -> self-contained report.html
    snapshots/          // saved PowerPlantState JSON presets
  src/context/...       // untouched simulation core
```

`package.json`: add `"sim": "tsx sim/run.ts"` and dev-dependency `tsx`.

## Build order

1. **Loop + CSV** — `run.ts` driving `PowerPlantTick` with a hardcoded scenario,
   samples to CSV. Proves the core runs headless. (~1 hour)
2. **Reducer-driven scenarios** — `Scenario` type, `applyScenario` via
   `PowerPlantReducer`, `startup-cold` encoded. (~1–2 hours)
3. **HTML report** — self-contained `report.html` with time-series panels. (~2 hours)
4. **First assertions** — `startup-cold` + `steady-state` expectations in vitest;
   fix or delete the currently failing turbine test while there. (~1 hour)
5. **Snapshots + overlay mode** — presets, A/B comparison runs. (later, as needed)

Steps 1–4 are roughly an afternoon. After step 4 the project is unblocked: parameter
tuning is cheap, the UX is guarded, and the physics corrections in `improvements.md`
become safe to attempt.

## Known wrinkles

- Driving `PowerPlantReducer` from Node works (verified in step 2).
- Hold-mode PID state is module-global in `TurbineTick.ts`, so hold-mode scenarios are not
  reproducible across runs in one process until it moves into `TurbineState`.
- Scenario actions are timed, not conditional: an action the reducer refuses (e.g.
  `TOGGLE_MAIN_STEAM_VALVE` below 10 bar) is silently a no-op. Assert the effect in tests.
