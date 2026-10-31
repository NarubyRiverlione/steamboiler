# Headless scenario runner

Drives the real simulation core (`powerPlantReducer`, `SIMULATE_TICK` plus operator actions) from Node, so a full startup runs in milliseconds and ends in a chart or an `expect` instead of minutes of gauge-watching. Scenarios dispatch the same actions as the UI, so they guard the manual-control path too. Built in #3–#7.

Workflow:

```
edit const.ts  →  pnpm sim <scenario>  →  open the newest sim/reports/*.html  →  compare curves
```

## Usage

`pnpm sim [scenario]` (default `bypass-loop`; writes
`sim/reports/<scenario>-<timestamp>.csv` and `.html`, git-ignored) runs a named scenario through `powerPlantReducer`
(`SIMULATE_TICK` + operator actions) and writes sampled boiler/turbine/condenser state as CSV plus
a self-contained HTML report in ~50 ms wall. Code: `sim/scenario.ts` (`Scenario`, `runScenario`,
`firstTimeWhere` for assertions), `sim/csv.ts` (`toCsv`), `sim/report.ts` (`toReportHtml`; the
panel list is the `panels` array), `sim/scenarios/` (one file per scenario, registered in
`index.ts`), `sim/run.ts` (CLI). A scenario's `initial` state is the cold plant from
`makeInitialState()` in `src/context/PowerPlantReducer.ts` (the UI starts there too), or a snapshot
(see **State snapshots**). `tsx` is a dev dependency only.

## Report

The report is hand-rolled SVG (no CDN, opens offline). Hovering any panel moves a synced
crosshair across all panels; dashed lines mark operator actions. On a headless machine,
`pnpm sim:serve` serves it on `0.0.0.0:4174` (`PORT` to override) and prints the LAN URLs; the
file is re-read per request, so re-run `pnpm sim` and refresh. `pnpm sim:view` does both.

Panels are grouped Boiler, Turbine, Condenser, Hotwell and Loop (the list is the `panels` array in
`sim/report.ts`). The **Loop** group's water inventory shows a total that should stay flat
(boundary flows undone). The water
invariant counts makeup, reject and drain as boundary flows via the totalizers `makeupTotal`,
`rejectTotal` and `drainedTotal`, so they are not flagged as created or lost water.

## Scenarios

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

## Operator hook

A scenario's optional `operator(state, time)` is a feedback hook called every tick after the timed
actions; its actions go through `powerPlantReducer` like any other. It must decide from state and
time alone so runs stay reproducible. `sim/scenarios/loop-operator.ts` is the one in use: it starts
steam (main steam valve, bypass, SJAE restart), nudges the condensation pump toward the boiler level
target and cooling water against condenser steam once a second, and opens makeup or reject on the
hotwell limits with hysteresis. Operator actions are not drawn as dashed lines in the report; the
valve panels in each group show the positions instead. Loop targets: [feedwater-loop.md](../plant/feedwater-loop.md).

## Tests

Goal checks live in `sim/scenario.test.ts`. `sim/invariants.ts` holds the physical invariants
(no NaN, design pressure and temperature, water within capacity, water never created or lost,
natural cooldown never heats and stops steam generation); `sim/invariants.test.ts` checks every
invariant against every registered scenario, one test per pair. A pair that fails today is in its
`expectedFailures` table as a `test.fails` naming the fixing ticket; when that ticket lands the test
turns red, so remove the entry to make the pair a guard.

## State snapshots

A snapshot is a full `PowerPlantState` as plain JSON in `sim/snapshots/<name>.json`,
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

## Pitfalls

- Scenario actions are timed, not conditional: an action the reducer refuses (e.g.
  `TOGGLE_MAIN_STEAM_VALVE` below 10 bar) is silently a no-op. Assert the effect in tests.
