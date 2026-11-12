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
`runScenarioWithLifts`, `firstTimeWhere` for assertions), `sim/csv.ts` (`toCsv`; the speed mode is the column `turbine_speedMode`: 0 Free, 1 Ramp up, 2 Hold), `sim/report.ts` (`toReportHtml`; the
panel list is the `panels` array), `sim/scenarios/` (one file per scenario, registered in
`index.ts`), `sim/run.ts` (CLI). A scenario's `initial` state is the cold plant from
`makeInitialState()` in `src/context/PowerPlantReducer.ts` (the UI starts there too), or a snapshot
(see **State snapshots**). `tsx` is a dev dependency only.

## Report

The report is hand-rolled SVG (no CDN, opens offline). Hovering any panel moves a synced
crosshair across all panels. Clicking a chart, pressing `L` or flipping the header's **Lock cursor**
switch freezes the crosshair and readouts so you can scroll to other panels; flip the switch or press `L` to
unlock. Dashed lines mark operator actions and shaded bands mark relief valve
lifts, which are also listed with open and close time and vented mass. A panel with a `limit` draws it as a red
dashed line and keeps it on the axis: the Boiler **Heating rate** chart (K/h) shows the 100 K/h
heating-rate limit. Lifts are recorded per tick
(`runScenarioWithLifts`, `trackLifts`), so a lift shorter than the sample interval still shows. On a headless machine,
`pnpm sim:serve` serves it on `0.0.0.0:4174` (`PORT` to override) and prints the LAN URLs; the
file is re-read per request, so re-run `pnpm sim` and refresh. `pnpm sim:view` does both.

Panels are grouped Boiler, Turbine, Condenser, Hotwell, Deaerator and Loop (the list is the `panels` array in
`sim/report.ts`). The **Turbine** speed row reads RPM, Frequency (derived from rpm), Electric output (the load carried). The **Turbine** steam flow panel uses semantic colours (bypass red, turbine
green, total blue); every other flow chart is one hue per chart. The **Loop** group's water
inventory shows a total that should stay flat
(boundary flows undone). The water
invariant counts makeup, reject, drain and vent as boundary flows via the totalizers `makeupTotal`,
`rejectTotal`, `drainedTotal` and `ventedTotal`, so they are not flagged as created or lost water.
A panel with `span: 3` (the Loop chart) stretches across three grid columns on wide viewports.

## Scenarios

Scenarios (`pnpm sim <name>`), defined and classed in [testing.md](testing.md). Golden path scenarios run the plant as meant; edge scenarios cross one limit. Golden `turbine-sync` and `turbine-load` and the edge scenarios start from a committed snapshot.

| Scenario | Class | Starts from | Goal |
| --- | --- | --- | --- |
| `bypass-loop` | golden | cold | cold start with the gas ramped at the heating-rate limit (`rampedLoopOperator`: the gas follows the smoothed rate, `steerHeatingRate`, whenever the pressure is below the working band, #103), bypass only; the main steam valve stays shut during heat-up (35% cold fill expands to 50%, ADR 0018) and opens at working pressure (163 bar, 21 995 s = 6.1 h); the bypass is a fixed 10%, and that steam draw (and the Return it brings back) pulls the pressure down to ~80 bar at 22 300 s while the gas, still limited by the rate, catches up; pressure is back at 163 bar at 25 800 s, then gas holds 165 ± 2 bar, with boiler level at 50% and the hotwell at 70% (#19, #43). The heating-rate alarm never rises (peak 81 K/h). Runs 32 400 s (9 h): the loop settles after about 600 s, no relief lift, no reject (see feedwater-loop.md). Source of the `bypass-loop` snapshot |
| `turbine-runup` | golden | cold | two phases (`startupOperator`). Build pressure: the gas follows the heating rate (`steerHeatingRate`, #103) from cold to working pressure, the main steam valve opens at 163 bar (21 995 s, ADR 0018) with the bypass cracked to 5% (the turbine valve stays shut: a 5% turbine crack at working pressure passes 10 kg/s against ~4.3 kg/s of no-load flow and would spin the rotor past `MaxRPM`); the steam draw pulls the pressure down to ~97 bar at 22 260 s and the gas, still following the rate, brings it back to 163 bar at 24 825 s. Pressure hold and run-up: from then gas becomes the throttle (`PressureHoldSettings`) with the holds of `loopOperator`, the boiler level hold runs from the moment the valve opens, nothing is rejected and the hotwell stays at 50–70%, and the operator takes Ramp up through 500, 1500, 2500 and 3000 rpm (from Free it selects 500 and starts Ramp up; each time Hold engages it selects the next point, so Hold lasts one tick at 500, 1500 and 2500 and only shows in a per-tick run). The reference moves at 50 rpm/min and the speed tracks it within 0.4 rpm; the run-up takes 60 min and Hold engages at 3000 rpm at ~28 430 s (7.9 h). The run ends after a 600 s settling time (`StartupSettings.SettlingTime`, the window turbine-sync judges; the scenario has no stop condition, so `Duration` is 29 800 s): Hold at 3000 ± 2 rpm, pressure 165 ± 2 bar, steam out matches steam generated within 5%, breaker open, no heating-rate alarm (peak 81 K/h). Source of the `turbine-runup` snapshot |
| `turbine-sync` | golden | `turbine-runup` | starts in Hold at 3000 rpm (no mode toggle in the scenario), the operator closes the breaker within ±2 rpm at the first tick; over the last 600 s the breaker stays closed (it reopens itself outside ±2). Per tick the breaker closes once and never reopens. The test also engages Hold from Free at ±5 rpm (the scenario itself starts settled): the valve never shuts and the speed stays within 3000 ± 10 rpm (#63) |
| `turbine-load` | golden | `turbine-sync` | the operator shuts the bypass and sets the load setpoint to 125 MW at t = 0 (#71, #14; rated output, 141.9 MW, is out of reach, #82), the load climbs at 3% of rated per minute and the gas ceiling is full gas; speed stays within ±2 rpm all the way, the breaker never opens, the electric output tracks the load; over the last 600 s pressure is 165 ± 2 bar, boiler and hotwell levels hold their operator bands, speed stays within ±2 rpm of sync, the breaker stays closed and the relief valve never lifts (the former `steady-state` idea, #38) |
| `relief-lift` | edge | cold | full gas with everything closed until the relief valve lifts (~259 s, the deaerator draws let-down steam, #119), then gas off at 250 s: one lift, 178 → 171 bar, then cooldown (the #46 expected failure no longer fires with the 35% cold fill; the steam density kink itself is still tracked in #46); full gas is far past the heating-rate limit, so the alarm is expected here (#103) |
| `hotwell-high` | edge | `bypass-loop` | makeup forced open, reject shut: the level reaches 95% (`HotwellHighHigh`), the clamp forces the reject open, no overflow |
| `hotwell-low` | edge | `bypass-loop` | makeup shut and reject forced open (a closed loop never drains by itself): the condensation pump trips as the level crosses 10% (`HotwellLowLow`) |
| `boiler-low` | edge | cold | full gas for an hour with everything closed: the heating-rate alarm comes on at once and stays on, as expected for full gas against the 100 K/h limit (peak ≈ 103 K/min, #103), the relief valve lifts at ~259 s and holds the pressure below design (peak ≈ 178.1 bar, 356.1 °C), until the burner trips at ~289 s with ~19.8 m³ left (the deaerator warm-up delays all three, #119; its let-down valve shuts with the trip) (ADR 0017); the boiler never runs dry |
| `return-stop` | edge | bypass-loop snapshot | full gas and the bypass fully open, the feed pump shuts at 15 s: the economizer recovers nothing and the cold feed no longer costs heat, so pressure rises (from 159 to the relief opening in about 40 s) and the relief valve keeps it at or below 178 bar plus one tick (#87, #74). The burner trips on low level later |
| `heat-up` | edge | cold | cold → working pressure (165 bar) with everything closed, the operator ramping the gas at the heating-rate limit (`rampOperator`): reaches 165 bar at ~21 595 s (6.0 h, runs 7 h of plant time, about 8 s of wall time), smoothed rate peaks at 80 K/h, no alarm; knob fully down at 165 bar, the gas ramps off in about 7 s |
| `low-pressure-close` | edge | `turbine-sync` | gas off and bypass fully open with the turbine in Hold: the burner trips on low level at ~191 s, the hotwell reaches 95% so its clamp forces the reject open, and at ~388 s the first tick starting at or below 10 bar closes the main steam valve and trips the turbine, under vacuum, so the trip can only be the closure; no steam leaves through either valve after that (ADR 0026). The draw flashes water with the gas off, which the invariant "natural cooldown steam comes from stored heat" accepts (#58) |
| `max-output` | edge | `turbine-sync` | bypass shut (a delta of −1; it was a no-op before #74), load setpoint to `LoadSetpointLimit` at t = 0, Hold, gas ceiling full gas (#84). The gas is the limit (#74): the load climbs at the load rate, full gas is reached at about 138 MW and 192 kg/s (about 1950 s) and the valve is nearly full by then (200 kg/s at 165 bar, #88): pressure sags a little while Hold keeps opening the valve until it is fully open at about 142 MW, and the breaker opens on the speed sag a moment later, which is the plant's maximum output. Load rejection after that: speed peaks under `MaxRPM`, Hold returns to 3000 ± 2 rpm, and the relief valve lifts several times with pressure at most 178.1 bar, because the gas hold comes down slowly |
| `vacuum-loss` | edge | `turbine-sync` | pump and SJAE off with the shell started a few minutes short of the vacuum limit (the sourced in-leakage needs hours from the design vacuum, ADR 0035): the air builds up at exactly the in-leakage rate, the pressure passes 327 mbar and the turbine trips on the vacuum limit (#91, #109) |
| `sjae-closed-load` | edge | `turbine-sync` | the `turbine-load` plant with the SJAE valve closed and the air extraction pump running: 125 MW is carried, the air stays a trace, the vacuum holds near the design vacuum and the turbine never trips (#91, #109) |
| `deaerator-vent-closed` | edge | cold | the `bypass-loop` start with the deaerator start-up vent never opened (`loopOperatorWithoutVent`): the 109 kg of air stay, the pressure runs ahead of saturation, the 4 bar relief valve lifts once at about 475 s (about 90 kg of steam lost, over half of the air gone with it) and the vessel is hot at 490 s at 3.7 bar; the warning flag is on, no damage (#120) |
| `deaerator-vent-open` | edge | cold | the same start with the vent opened at t=0 and left open (`loopOperatorLeavingVentOpen`): the air is out at 390 s, then steam leaves at up to 20 kg/s (6.2 t); the vessel peaks at 123 °C, the boiler's burner trips on low level at 530 s and the vessel falls back to 100 °C at 1 bar; the open-with-no-air flag is on from 390 s (#120) |
| `turbine-overspeed` | edge | `turbine-sync` | breaker opened and Free at t = 0, the turbine valve opened a further 30% at 10 s: the unloaded rotor accelerates and the turbine trips at `MaxRPM` (valve 0, Free, `turbineTripped`), the peak at most a tick or two above it, then the speed falls and the pressure stays under the design pressure (#72, ADR 0040) |
| `turbine-trip` | edge | `turbine-sync` | the `turbine-load` run to 125 MW, then at 2500 s Hold goes to Free, the turbine valve slams shut and the bypass opens fully to dump the steam (#88). The turbine takes no steam, so the extraction heater loses its tap at once: extraction and tap pressure are 0 and the Return reaches the economizer at the hotwell temperature. The cold Return costs heat and the pressure falls to about 136 bar at full gas, under the design pressure all the way |

The other cold starts (`bypass-loop`, `turbine-runup`, `boiler-low`, `relief-lift`, `heat-up`, and everything built on `loopOperator`) open the deaerator start-up vent at t=0 and close it when the safe-to-close lamp lights (`startUpVent` in `sim/scenarios/steps.ts`); snapshot starts have no air and leave the vent alone. In `bypass-loop` the lamp lights at 11 500 s and the vessel is hot at 12 557 s, at the heating-rate limit's pace (#120, #103).

`sim/golden/exhaust-split.test.ts` runs no named scenario: from the `bypass-loop` snapshot it puts the same 25% on the bypass and on the turbine valve for 120 s, and checks the wetter exhaust gives a lower condenser pressure than bypass steam and that all of the intake reaches the hotwell on either path (#81, #91).

The turbine valve only opens under the vacuum limit, and above it an open valve closes in a turbine
trip (ADR 0003). So the turbine scenarios hold the vacuum: `airPumpOn` starts the air extraction pump at
t=0 (under the limit within seconds), and `openMainSteamActions` enables the SJAE and opens its valve when the operator opens the main steam valve at working pressure
(the SJAE also switches itself off below main-steam-valve pressure), opens the
recirculation pump so the exhaust condenses, and opens the condensation pump just far enough to
return the condensate without emptying the 20 °C hotwell into the boiler. A scenario test checks,
every tick, that no turbine trip happens. The condensation pump follows the turbine valve by hand;
there is no level control. Use `bypass-loop` for the controlled loop.

## Operator hook

A scenario's optional `operator(state, time)` is a feedback hook called every tick after the timed
actions; its actions go through `powerPlantReducer` like any other. It must decide from state and
time alone so runs stay reproducible. `sim/scenarios/heat-up.ts` has `rampOperator`: once a second it
turns the gas knob to raise the gas 4 L/s over the next second while the smoothed heating rate is under 60% of the limit (60 K/h, a margin under the 100 K/h
limit: the readout lags 30 s and the deaerator let-down valve closes within 0.3 s when the deaerator reaches its 3 bar setpoint, about 8888 s at 90%, which jumps the rate, #130) and to lower it 30 L/s above (backing off is quicker than creeping up), and turns the knob fully down at 165 bar.
The gas is a rate command ([ADR 0033](../adr/0033-gas-is-a-rate-knob.md)), so a scenario never sets a gas value:
`sim/scenarios/gas.ts` has `setGasCommand` (a timed action), `rampGas` (full deflection for whole ticks, the remainder in one tick, then the knob centred) and `steerGas` (the operator's hand on the knob: the command that reaches a target gas in N seconds, full deflection for 0 or the maximum so the clamp hits it exactly).
`sim/scenarios/loop-operator.ts` is the other: it starts
steam (gas back from full to `StartGas` from 120 bar on, main steam valve, bypass at its fixed 10%, condensation pump and feed pump start positions, SJAE restart),
nudges the gas toward the working pressure (`sim/scenarios/pressure-hold.ts`, shared with `turbine-runup`),
the feed pump toward the boiler level target, the condensation pump toward the deaerator level target (#112) and cooling water against condenser steam once a second, and sets makeup and reject in
proportion to the distance outside the 55–75% hotwell band. Operator actions are not drawn as dashed lines in the report; the
valve panels in each group show the positions instead. Operator settings, not plant physics: gas step 20 L/s per second (a turn of the knob) and valve nudge 0.02 per adjustment, fast enough that `bypass-loop` stays under the relief setpoint and inside the boiler level band with the condenser on its real energy balance. Loop targets: [feedwater-loop.md](../plant/feedwater-loop.md).

## Tests

Layers, goal checks and the definition of done: [testing.md](testing.md). Goal checks live in `sim/golden/` and `sim/edge/`, one file per scenario. `sim/invariants.ts` holds the physical invariants
(no NaN, design pressure and temperature, water within capacity, condensation pump return and feed pump delivery within
pump capacity, water never created or lost, natural cooldown never heats and its steam comes from stored heat); `sim/invariant-matrix.ts` checks every invariant against every scenario of a class, one test per pair. A pair that fails today is in its
`expectedFailures` table as a `test.fails` naming the fixing ticket; when that ticket lands the test
turns red, so remove the entry to make the pair a guard. `sim/invariants.test.ts` checks each invariant on hand-built samples (unit).

**Premise of "natural cooldown steam comes from stored heat" (#58).** With the gas off, a flash is not generation: it
takes its latent heat from the water and the steel, and a steam draw or a contracting full drum flashes water legitimately.
What cannot happen is steam made from nothing, so at every sample pair with the gas off the flash power
(`deltaSteamMass × latent heat`) must not exceed the cooling power of the water and metal (`(m·cp + metal) × ΔT / Δt`)
plus what a Return hotter than the boiler brings. The check allows 3% for comparing a per-tick flash with a cooling
averaged over the 1 s sample interval (the worst measured is 1%). It holds from the first second of the cooldown, so there is
no grace period.

### Time limits

The golden gate (`pnpm test:sim:golden`) takes about 40 s wall on a 6-core machine with the real heating-rate limit (#103; it was about 55 s on slower hardware before, when the cold starts took minutes of plant time): the cold starts now run 8 to 9 h of plant time, about 10 s each, so no scenario starts from a snapshot for speed's sake.

`sim/perf/runtime.test.ts` has a wall-clock guard: one simulated hour (`heatUp`, 3600 s, `sampleEvery: 10`) must
finish within 15 s. It is its own opt-in layer (`pnpm test:perf`, [ADR 0023](../adr/0023-runner-speed-guard-is-opt-in.md)), outside the `dev` gate.

Measured on a Mac, one simulated hour: 0.37 s under `tsx`, 0.5 s under Vitest, 1.4 s under Vitest with coverage. Vitest adds to `tsx` because it rewrites imports so that every read of an imported binding is a getter call, so a hot loop over an imported table pays for it; `bracket` in `src/utils/steamTable.ts` reads `steamTable` into a local once. Before `bracket` became a binary search (#73) the same run took 2.9 s and 7 s, nearly all of it scanning the steam table: each tick can run a 40-step bisection, and each step does three table lookups.

The 15 s limit dates from that slower code, on an i7-10710U (15 W laptop CPU). The vitest `testTimeout` in `vite.config.ts` is 30 s, for long scenarios under coverage.

## Water drift

The water is held as kg ([ADR 0007](../adr/0007-water-state-is-mass-in-kg.md)), so the loop conserves it to floating-point rounding. Measured over all scenarios at 1 s sampling (`loopWater`, which undoes makeup, reject, drain and vent):

| | Worst case | Limit in `sim/invariants.ts` |
|---|---|---|
| Water created, fraction of start mass | 3.7e-15 after 5800 s (`turbine-runup`, re-measured in #70 after its run was shortened; the other scenarios were not re-measured, the 1.9e-12 of the old 14000 s run was the worst before) | `MassCreatedLimit` = 1e-12 per 1800 s of sim time, 1e-12 minimum: the rounding adds up tick by tick |
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
- Sources: `turbine-runup` (for `turbine-sync`), `turbine-sync` (for `turbine-load`) and `bypass-loop` (for the edge set). A source starts from cold or from an earlier source; `pnpm sim:snapshots` writes them in the listed order, so a chained one loads the fresh file ([ADR 0022](../adr/0022-electric-output-from-enthalpy-drop.md)).

The UI Presets popup (#24) loads Cold & dark, Hot standby (`bypass-loop`) and At pressure (`turbine-runup`) from these snapshots; the app itself starts cold.

## Pitfalls

- Scenario actions are timed, not conditional: an action the reducer refuses (e.g.
  `TOGGLE_MAIN_STEAM_VALVE` below 10 bar) is silently a no-op. Assert the effect in tests.
