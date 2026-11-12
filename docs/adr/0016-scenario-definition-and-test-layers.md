# A scenario ends in goal checks; two classes, three test layers

The headless runner had nine scenarios with no definition of what one is for. Several overlapped, one demonstrated a bug instead of checking a goal, and `turbine-sync` failed three tests that were not marked as expected, which kept the CI `check` job red. Scenarios are the main test of plant behaviour and the definition of done for tickets, so they need a definition. This ADR gives it, and the test layers the gates of [ADR 0014](0014-ticket-branches-and-test-gates.md) run. The reference is [testing.md](../dev/testing.md).

A **scenario** is a reproducible operator procedure from a known plant state, run through the real reducer, ending in **goal checks** (measurable results with tolerances) and run under every invariant. A run with no goal check is not a scenario.

| Class | Purpose | Pass rule |
|---|---|---|
| Golden path | How the plant is meant to be run; each step adds one thing | All invariants and goal checks pass; a goal not reachable yet is a `test.fails` naming its ticket |
| Edge | Drive the plant past one limit and check that its protection acts | All invariants pass, except `expectedFailures` entries naming a fixing ticket |

## Decisions

- No bug-demo scenarios: a known gap is a `test.fails` goal check in an existing scenario.
- Admission: a new scenario needs a start state or operator procedure no existing one covers; otherwise it is a new goal check.
- Removed: the old `turbine-sync` (a demo of #18), `turbine-start`, `heat-to-msv` and the `at-pressure` snapshot (duplicates of the first half of `turbine-runup`), `cooldown` (moves to the shutdown scenario of #38, a golden-path scenario: a shutdown is how the plant is meant to be run). `startup-cold` is renamed `turbine-runup`, `full-gas` `boiler-low`; the new `turbine-sync` starts from the `turbine-runup` snapshot. `turbine-load` is added by #14, `boiler-high` by #62.
- Edge scenarios start from the settled `bypass-loop` snapshot with the loop operator running and force only what crosses their limit, unless their limit needs a cold plant: `relief-lift`, `boiler-low` and `heat-up` start cold. `hotwell-low` also forces the reject open: the closed loop conserves its water, so shutting the makeup alone never drains the hotwell.
- Test layers: unit (`src/` and sim tooling, under a second), sim golden (`sim/golden/`), sim edge (`sim/edge/`), three Vitest projects with scripts `test:unit`, `test:sim:golden`, `test:sim:edge`; `test` runs all. A file that runs a registered scenario is sim, everything else is unit.
- One run per scenario: each registered scenario runs once, in its own file `sim/<class>/<name>.test.ts`, and that run carries its invariants, the golden-only invariants (no level alarm or level trip on the golden path), its stale-snapshot check and its goal checks (`runChecked`, [testing.md](../dev/testing.md)). Before, a separate invariant-matrix file, an alarm file and a snapshot file each ran the scenarios again, and the golden and edge layers took about 20 s each where one run each takes under 10. A unit test fails when a registered scenario has no such file.
- Definition of done for a ticket that changes plant behaviour or control: it names the scenario(s) and goal check(s) that prove it; a `test.fails` naming it becomes a `test`, or a goal check is added; the golden path stays green; snapshots are regenerated and the scenario table updated in the same commit.

## Consequences

- Hooks and CI jobs per layer are #61.
- A scenario does not re-check what a unit test pins; it checks the outcome.
