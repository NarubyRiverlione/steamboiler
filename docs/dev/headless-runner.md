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

Scenarios (`pnpm sim <name>`), defined and classed in [testing.md](testing.md). Golden path scenarios run the plant as meant; edge scenarios cross one limit. Golden `turbine-sync` and the new edge scenarios start from a committed snapshot.

| Scenario | Class | Starts from | Goal |
| --- | --- | --- | --- |
| `bypass-loop` | golden | cold | cold start at full gas, bypass only; above 10 bar gas to `StartGas` (2000 L/s), the main steam valve opens and the bypass goes to a fixed 10%; pressure builds to 165 bar, then gas holds 165 ± 2 bar, with boiler level at 50% and the hotwell at 70% (#19, #43). Runs 7200 s: the loop settles after about 6600 s, no relief lift (see feedwater-loop.md). Source of the `bypass-loop` snapshot |
| `turbine-runup` | golden | cold | two phases (`startupOperator`). Build pressure: cold → 10 bar, main steam valve open, turbine valve cracked to 5% at 790 s, gas 2000 L/s, so pressure rises. Pressure hold: when pressure first enters 165 ± 2 bar (~2000 s) the turbine valve opens once to 9.1% (18.2 kg/s; speed settles near steam flow × pressure = 3003 rpm) and gas becomes the throttle (`PressureHoldSettings`), with the holds of `loopOperator`. Hold mode off, breaker open. The turbine speed has a time constant of about 2600 s, so the run lasts 14000 s: over the last 600 s pressure is 165 ± 2 bar and speed 3000 ± 50 rpm. Source of the `turbine-runup` snapshot |
| `turbine-sync` | golden | `turbine-runup` | hold mode on, the PID takes the speed to 3000 rpm (it overshoots to ~3018 rpm and chatters for the first minute), the operator closes the breaker within ±2 rpm; over the last 600 s the breaker stays closed (it reopens itself outside ±2) |
| `relief-lift` | edge | cold | full gas with everything closed until the relief valve lifts (~289 s), then gas off at 291 s: one lift, 178 → 171 bar, then cooldown; expected failure #46 |
| `hotwell-high` | edge | `bypass-loop` | makeup forced open, reject shut: the level reaches 95% (`HotwellHighHigh`), the clamp forces the reject open, no overflow |
| `hotwell-low` | edge | `bypass-loop` | makeup shut and reject forced open (a closed loop never drains by itself): the condensation pump trips as the level crosses 10% (`HotwellLowLow`) |
| `boiler-low` | edge | cold | full gas for an hour with everything closed: the heating-rate alarm comes on at once (peak ≈ 78 K/min), the relief valve lifts at ~289 s and holds the pressure below design (peak ≈ 178.1 bar, 356.0 °C), until the burner trips at ~371 s with ~20 m³ left (ADR 0017); the boiler never runs dry |
| `heat-up` | edge | cold | cold → working pressure (165 bar) with everything closed, the operator ramping the gas at the heating-rate limit (`rampOperator`): reaches 165 bar at ~996 s (16.6 min), smoothed rate peaks at 22.8 K/min, no alarm; gas off at 165 bar |

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
steam (gas down to `StartGas`, main steam valve, bypass at its fixed 10%, condensation pump start position, SJAE restart),
nudges the gas toward the working pressure (`sim/scenarios/pressure-hold.ts`, shared with `turbine-runup`),
the condensation pump toward the boiler level target and cooling water against condenser steam once a second, and sets makeup and reject in
proportion to the distance outside the 55–75% hotwell band. Operator actions are not drawn as dashed lines in the report; the
valve panels in each group show the positions instead. Operator settings, not plant physics: gas step 20 L/s and valve nudge 0.02 per adjustment, fast enough that `bypass-loop` stays under the relief setpoint and inside the boiler level band with the condenser on its real energy balance. Loop targets: [feedwater-loop.md](../plant/feedwater-loop.md).

## Tests

Layers, goal checks and the definition of done: [testing.md](testing.md). Goal checks live in `sim/golden/` and `sim/edge/`, one file per scenario. `sim/invariants.ts` holds the physical invariants
(no NaN, design pressure and temperature, water within capacity, condensation pump return within
pump capacity, water never created or lost, natural cooldown never heats and stops steam
generation); `sim/invariant-matrix.ts` checks every invariant against every scenario of a class, one test per pair. A pair that fails today is in its
`expectedFailures` table as a `test.fails` naming the fixing ticket; when that ticket lands the test
turns red, so remove the entry to make the pair a guard. `sim/invariants.test.ts` checks each invariant on hand-built samples (unit).

### Time limits

`sim/golden/runtime.test.ts` has a wall-clock guard: one simulated hour (`heatUp`, 3600 s, `sampleEvery: 10`) must
finish within 15 s. Measured on an i7-10710U (15 W laptop CPU): 2.6 s plain, 7.8–8.6 s under
`vitest --coverage`, because v8 instrumentation of the simulation core slows it about 3×. The crap-score
tool always runs with coverage, so the earlier 5 s limit failed there while passing in `pnpm test`.
15 s is about twice the slowest measured coverage run: it still catches an order-of-magnitude
regression and tolerates slower hardware. The vitest `testTimeout` in `vite.config.ts` is 30 s for the same reason.
A full coverage run takes about 125–150 s on that machine, so score changed files only (`--changed`).

## Water drift

The water is held as kg ([ADR 0007](../adr/0007-water-state-is-mass-in-kg.md)), so the loop conserves it to floating-point rounding. Measured over all scenarios at 1 s sampling (`loopWater`, which undoes makeup, reject, drain and vent):

| | Worst case | Limit in `sim/invariants.ts` |
|---|---|---|
| Water created, fraction of start mass | 1.9e-12 after 14000 s (`turbine-runup`; 2.0e-13 at 3000 s) | `MassCreatedLimit` = 1e-12 per 1800 s of sim time, 1e-12 minimum: the rounding adds up tick by tick |
| Water lost with no steam out, fraction of start mass | 2.3e-14 (`heat-up`) | `MassLostFixed` = 1e-13 |
| Water lost per kg of steam out of the boiler | 5.1e-12 (`bypass-loop`) | `MassLostPerSteamOut` = 2e-11 |

The slack above the measured drift (a factor of 3 to 4, 4 at the end of the 14000 s run) covers rounding in the sums only; before #34 the limits were 0.1%, 0.1% and 2%, which hid the 1.13–1.4 L-per-kg error. Never loosen a limit to make a test pass: re-measure and explain.

## State snapshots

A snapshot is a full `PowerPlantState` as plain JSON in `sim/snapshots/<name>.json`,
committed. A scenario starts from one with `initial: loadSnapshot("<name>")` (`sim/snapshot.ts`);
the loader compares the file with the shape of `makeInitialState()` and throws on missing or extra
keys or a wrong type, so a snapshot from an older state shape fails loudly instead of running.

- `pnpm sim <scenario> --snapshot <name>` writes the run's final state to
  `sim/snapshots/<name>.json` (ad hoc).
- Committed snapshots are listed in `sim/snapshot-sources.ts` with the scenario whose final state
  they are; `pnpm sim:snapshots` regenerates them all. `sim/golden/snapshot.test.ts` fails when a committed
  file no longer matches a fresh run of its source, so after a physics or state change: run
  `pnpm sim:snapshots`, look at the diff, commit. The comparison is tolerant ([ADR 0020](../adr/0020-snapshots-compare-with-tolerance.md)):
  numbers match within a relative 1e-9 (absolute 1e-12 near 0, `valueErrors` in `sim/snapshot.ts`), so last-digit
  noise between machines or Node versions passes and a failure names the field path; shape, strings and booleans stay exact.
  A physics change smaller than 1e-9 relative is not caught here, the scenario goal checks cover that.
- Sources: `turbine-runup` (for `turbine-sync`) and `bypass-loop` (for the edge set). A source starts from cold.

UI presets ("cold", "hot standby", "at pressure") are #24; the UI starts cold.

## Pitfalls

- Scenario actions are timed, not conditional: an action the reducer refuses (e.g.
  `TOGGLE_MAIN_STEAM_VALVE` below 10 bar) is silently a no-op. Assert the effect in tests.
