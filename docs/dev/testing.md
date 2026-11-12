# Testing

Why: [ADR 0016](../adr/0016-scenario-definition-and-test-layers.md), [ADR 0023](../adr/0023-runner-speed-guard-is-opt-in.md). Which layer runs at which gate: [branching.md](branching.md). The scenarios themselves: [headless-runner.md](headless-runner.md).

## Layers

| Layer | Script | Where | Checks | Cost |
|---|---|---|---|---|
| Unit | `pnpm test:unit` | `src/`, `scripts/`, `sim/` outside `golden/`, `edge/` and `perf/` | one function or one tick: formulas, reducer rules, operator functions, invariant checks on hand-built samples, snapshot loader | ~1 s |
| Sim golden | `pnpm test:sim:golden` | `sim/golden/` | golden-path scenarios, their invariants, the stale-snapshot check (tolerant, ADR 0020) | ~10 s |
| Sim edge | `pnpm test:sim:edge` | `sim/edge/` | edge scenarios and their invariants | ~8 s |
| UI | `pnpm test:ui` | `src/components/`, `src/navigation/` (`*.test.tsx`) | board components in jsdom: an action is dispatched, a tile lights from a flag; never SVG geometry | ~1 s |
| Perf | `pnpm test:perf` | `sim/perf/` | the runner wall-clock guard | ~1 s |

`pnpm test` runs unit, ui, golden and edge (Vitest projects in `vite.config.ts`). Perf is opt-in, with its own `vitest.perf.config.ts`: a wall-clock limit depends on the machine, so `pnpm test` and a coverage run skip it. A test file that runs a registered scenario is sim and lives in `sim/golden/` or `sim/edge/`; everything else is unit. Coverage (`pnpm exec vitest run --coverage`) counts every file under `src/`, `sim/` and `scripts/` (the `coverage` block in `vite.config.ts`), so a file no test imports shows as 0% instead of dropping out; tests, `*.d.ts`, `src/main.tsx` and the CLI entry points (`scripts/roadmap.ts`, `sim/run.ts`, `sim/serve.ts`, `sim/write-snapshots.ts`), `sim/perf/`, `sim/reports/` and `sim/snapshots/` are excluded. A scenario does not re-check what a unit test pins; it checks the outcome.

## Scenario

A reproducible operator procedure from a known plant state, run through the real reducer, ending in goal checks (measurable results with tolerances) and run under every invariant. A run with no goal check is not a scenario. A new one needs a start state or operator procedure no existing one covers; otherwise add a goal check to an existing one. No bug demos: a known gap is a `test.fails` goal check naming its ticket.

| Class | Pass rule |
|---|---|
| Golden path | all invariants, the golden-only invariants (no level alarm, no level trip) and goal checks pass |
| Edge | all invariants pass, except `expectedFailures` entries (`sim/scenario-checks.ts`) naming a fixing ticket |

**One run per scenario.** A registered scenario runs once, in its own file `sim/<class>/<name>.test.ts`, through `runChecked` (`sim/scenario-checks.ts`). That one run carries everything: one test per invariant, the stale-snapshot check when the scenario is a snapshot source (`sim/snapshot-sources.ts`), and the file's goal checks. A run takes seconds and Vitest gives each file its own worker, so a second file that reruns a scenario repeats those seconds; the slowest file sets the wall time of the layer.

- `runChecked` takes the registered scenario object unchanged; only `sampleEvery` may be finer, which only makes the invariants stricter. It refuses a modified scenario and refuses to run in any file but the scenario's own.
- `sim/scenario-files.test.ts` (unit) fails when a registered scenario has no such file, so a new scenario cannot skip its invariants.
- A goal check that needs a different start or a tick-resolution window runs a short sub-run from a state of the main run (`turbine-runup`'s run-up points, `turbine-sync`'s Hold engage), never the whole scenario again. A shortened run keeps only the timed actions inside it (`scheduleActions` rejects the rest).

## Definition of done

A ticket that changes plant behaviour or control:

1. names the scenario(s) and goal check(s) that prove it;
2. turns the `test.fails` naming it into a `test`, or adds a goal check;
3. keeps the golden path green;
4. regenerates the snapshots (`pnpm sim:snapshots`) and updates the scenario table in [headless-runner.md](headless-runner.md), in the same commit;
5. updates every ADR it touches, in the same commit.
