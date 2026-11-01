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
`runScenarioWithLifts`, `firstTimeWhere` for assertions), `sim/csv.ts` (`toCsv`), `sim/report.ts` (`toReportHtml`; the
panel list is the `panels` array), `sim/scenarios/` (one file per scenario, registered in
`index.ts`), `sim/run.ts` (CLI). A scenario's `initial` state is the cold plant from
`makeInitialState()` in `src/context/PowerPlantReducer.ts` (the UI starts there too), or a snapshot
(see **State snapshots**). `tsx` is a dev dependency only.

## Report

The report is hand-rolled SVG (no CDN, opens offline). Hovering any panel moves a synced
crosshair across all panels; dashed lines mark operator actions and shaded bands mark relief valve
lifts, which are also listed with open and close time and vented mass. A panel with a `limit` draws it as a red
dashed line and keeps it on the axis: the Boiler **Heating rate** chart (K/min) shows the 24 K/min
heating-rate limit. Lifts are recorded per tick
(`runScenarioWithLifts`, `trackLifts`), so a lift shorter than the sample interval still shows. On a headless machine,
`pnpm sim:serve` serves it on `0.0.0.0:4174` (`PORT` to override) and prints the LAN URLs; the
file is re-read per request, so re-run `pnpm sim` and refresh. `pnpm sim:view` does both.

Panels are grouped Boiler, Turbine, Condenser, Hotwell and Loop (the list is the `panels` array in
`sim/report.ts`). The **Turbine** steam flow panel uses semantic colours (bypass red, turbine
green, total blue); every other flow chart is one hue per chart. The **Loop** group's water
inventory shows a total that should stay flat
(boundary flows undone). The water
invariant counts makeup, reject, drain and vent as boundary flows via the totalizers `makeupTotal`,
`rejectTotal`, `drainedTotal` and `ventedTotal`, so they are not flagged as created or lost water.
A panel with `span: 3` (the Loop chart) stretches across three grid columns on wide viewports.

## Scenarios

Scenarios (`pnpm sim <name>`); each either replays the earlier operator steps from
`sim/scenarios/steps.ts` from cold, or starts from a snapshot with those steps moved by `since()`:

| Scenario | Starts from | Goal |
| --- | --- | --- |
| `startup-cold` | cold | cold → 10 bar, main steam valve open, turbine valve cracked |
| `heat-to-msv` | cold | cold → 10 bar with vacuum pulled, nothing opened; source of the `at-pressure` snapshot |
| `heat-up` | cold | cold → working pressure (165 bar) with everything closed, the operator ramping the gas at the heating-rate limit (`rampOperator`): reaches 165 bar at ~996 s (16.6 min), smoothed rate peaks at 22.8 K/min, no alarm; gas off at 165 bar |
| `turbine-start` | `at-pressure` | main steam valve, turbine valve to 25%, turbine rolling |
| `turbine-sync` | cold | more gas, turbine valve full, try the breaker; sync is unreachable today (#18, #21). The unfed boiler runs dry at ~1280 s and jumps to the critical point, past design pressure (#33, #43) |
| `cooldown` | cold | at pressure, then natural cooldown for 60 min: heat loss proportional to T − ambient, about 250 kW, so 194 → 190 °C in the hour |
| `bypass-loop` | cold | cold start at full gas, bypass only; above 10 bar gas to 5000 L/s and the main steam valve opens, then an operator holds 165 bar with the bypass, boiler level at 50% and the hotwell at 70% (#19). Reaches 165 bar since #12; since #34 the loop conserves water and holds, but the hotwell runs at about 327 °C (see feedwater-loop.md) |
| `relief-lift` | cold | full gas with everything closed until the relief valve lifts (~289 s), then gas off at 291 s: one lift, 178 → 171 bar, then cooldown |
| `full-gas` | cold | full gas for an hour with everything closed: the heating-rate alarm comes on at once (peak ≈ 78 K/min), the relief valve lifts at ~289 s and holds the pressure below design (peak ≈ 178.1 bar per tick while 1 m³ of water remains) until the boiler runs dry at ~395 s; its last litre and then the dry metal heat to the critical point, 220.6 bar (burner protection is #33) |

The turbine valve only opens under the vacuum limit, and above it an open valve closes in a turbine
trip (ADR 0003). So the turbine scenarios hold the vacuum: `heatUp` starts the air extraction pump at
t=0 (under the limit within seconds), and `openMainSteam` enables the SJAE and opens its valve once
the boiler is above main-steam-valve pressure (below it the SJAE switches itself off), opens the
recirculation pump so the exhaust condenses, and opens the condensation pump just far enough to
return the condensate without emptying the 20 °C hotwell into the boiler. A scenario test checks,
every tick, that no turbine trip happens. The condensation pump follows the turbine valve by hand;
there is no level control. Use `bypass-loop` for the controlled loop.

## Operator hook

A scenario's optional `operator(state, time)` is a feedback hook called every tick after the timed
actions; its actions go through `powerPlantReducer` like any other. It must decide from state and
time alone so runs stay reproducible. `sim/scenarios/heat-up.ts` has `rampOperator`: once a second it
raises the gas 20 L/s while the smoothed heating rate is under 0.36 K/s (a margin under the 0.4 K/s
limit for the readout's 30 s lag) and lowers it above, and cuts the gas at 165 bar.
`sim/scenarios/loop-operator.ts` is the other: it starts
steam (gas down, main steam valve, bypass and condensation pump start positions, SJAE restart),
nudges the bypass toward the operating pressure, the condensation pump toward the boiler level
target and cooling water against condenser steam once a second, and opens makeup or reject on the
hotwell limits with hysteresis. Operator actions are not drawn as dashed lines in the report; the
valve panels in each group show the positions instead. Loop targets: [feedwater-loop.md](../plant/feedwater-loop.md).

## Tests

Goal checks live in `sim/scenario.test.ts`. `sim/invariants.ts` holds the physical invariants
(no NaN, design pressure and temperature, water within capacity, condensation pump return within
pump capacity, water never created or lost, natural cooldown never heats and stops steam
generation); `sim/invariants.test.ts` checks every
invariant against every registered scenario, one test per pair. A pair that fails today is in its
`expectedFailures` table as a `test.fails` naming the fixing ticket; when that ticket lands the test
turns red, so remove the entry to make the pair a guard.

### Time limits

`scenario.test.ts` has a wall-clock guard: one simulated hour (`heatUp`, 3600 s, `sampleEvery: 10`) must
finish within 15 s. Measured on an i7-10710U (15 W laptop CPU): 2.6 s plain, 7.8–8.6 s under
`vitest --coverage`, because v8 instrumentation of the simulation core slows it about 3×. The crap-score
tool always runs with coverage, so the earlier 5 s limit failed there while passing in `pnpm test`.
15 s is about twice the slowest measured coverage run: it still catches an order-of-magnitude
regression and tolerates slower hardware. The vitest `testTimeout` in `vite.config.ts` is 30 s for the same reason.
A full coverage run takes about 125–150 s on that machine, so score changed files only (`--changed`).

## Water drift

The water is held as kg ([ADR 0007](../adr/0007-water-state-is-mass-in-kg.md)), so the loop conserves it to floating-point rounding. Measured over all eight scenarios at 1 s sampling (`loopWater`, which undoes makeup, reject, drain and vent):

| | Worst case | Limit in `sim/invariants.ts` |
|---|---|---|
| Water created, fraction of start mass | 1.2e-13 (`startup-cold`) | `MassCreatedLimit` = 1e-12 |
| Water lost with no steam out, fraction of start mass | 2.3e-14 (`heat-up`) | `MassLostFixed` = 1e-13 |
| Water lost per kg of steam out of the boiler | 5.1e-12 (`bypass-loop`) | `MassLostPerSteamOut` = 2e-11 |

The slack above the measured drift (a factor of 3 to 4) covers rounding in the sums only; before #34 the limits were 0.1%, 0.1% and 2%, which hid the 1.13–1.4 L-per-kg error. Never loosen a limit to make a test pass: re-measure and explain.

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
- `at-pressure` is the end of `heat-to-msv` (t = 780 s, ~13.7 bar). `turbine-start` starts from it, and
  a test checks that this gives exactly the same states as replaying the cold start.

UI presets ("cold", "hot standby", "at pressure") are #24; the UI starts cold.

## Pitfalls

- Scenario actions are timed, not conditional: an action the reducer refuses (e.g.
  `TOGGLE_MAIN_STEAM_VALVE` below 10 bar) is silently a no-op. Assert the effect in tests.
