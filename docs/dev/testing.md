# Testing

Why: [ADR 0016](../adr/0016-scenario-definition-and-test-layers.md), [ADR 0023](../adr/0023-runner-speed-guard-is-opt-in.md). Which layer runs at which gate: [branching.md](branching.md). The scenarios themselves: [headless-runner.md](headless-runner.md).

## Layers

| Layer | Script | Where | Checks | Cost |
|---|---|---|---|---|
| Unit | `pnpm test:unit` | `src/`, `scripts/`, `sim/*.test.ts` | one function or one tick: formulas, reducer rules, operator functions, invariant checks on hand-built samples, snapshot loader | ~1 s |
| Sim golden | `pnpm test:sim:golden` | `sim/golden/` | golden-path scenarios, their invariants, the stale-snapshot check (tolerant, ADR 0020) | ~5 s |
| Sim edge | `pnpm test:sim:edge` | `sim/edge/` | edge scenarios and their invariants | ~2 s |
| Perf | `pnpm test:perf` | `sim/perf/` | the runner wall-clock guard | ~1 s |

`pnpm test` runs unit, golden and edge (Vitest projects in `vite.config.ts`). Perf is opt-in, with its own `vitest.perf.config.ts`: a wall-clock limit depends on the machine, so `pnpm test` and a coverage run skip it. A test file that runs a registered scenario is sim and lives in `sim/golden/` or `sim/edge/`; everything else is unit. A scenario does not re-check what a unit test pins; it checks the outcome.

## Scenario

A reproducible operator procedure from a known plant state, run through the real reducer, ending in goal checks (measurable results with tolerances) and run under every invariant. A run with no goal check is not a scenario. A new one needs a start state or operator procedure no existing one covers; otherwise add a goal check to an existing one. No bug demos: a known gap is a `test.fails` goal check naming its ticket.

| Class | Pass rule |
|---|---|
| Golden path | all invariants and goal checks pass |
| Edge | all invariants pass, except `expectedFailures` entries (`sim/invariant-matrix.ts`) naming a fixing ticket |

The invariant matrix (every invariant on every scenario of a class) is `describeInvariants` in `sim/invariant-matrix.ts`, used by `sim/golden/invariants.test.ts` and `sim/edge/invariants.test.ts`.

## Definition of done

A ticket that changes plant behaviour or control:

1. names the scenario(s) and goal check(s) that prove it;
2. turns the `test.fails` naming it into a `test`, or adds a goal check;
3. keeps the golden path green;
4. regenerates the snapshots (`pnpm sim:snapshots`) and updates the scenario table in [headless-runner.md](headless-runner.md), in the same commit.
