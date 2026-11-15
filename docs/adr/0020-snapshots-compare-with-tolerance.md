# Committed snapshots compare with a relative tolerance, not exact digits

The golden snapshot test (ADR 0016) compared a committed snapshot with a fresh run of its source scenario digit for digit. On 2026-11-03 it failed on a `dev` with no physics change: regenerating differed only from about the 12th significant digit, in condenser fields. The cause is not confirmed; the suspect is a different machine or Node version, since `Math.pow` and `Math.exp` may differ in the last digits between engines. If so, an exact test fails on every machine that did not write the files, CI included (#49, #61). Ticket #67.

The test now compares every number with `valueErrors` (`sim/snapshot.ts`): equal when within a relative tolerance of 1e-6 of the larger magnitude, with an absolute floor of 1e-12 for values near 0. Shape, strings, booleans and null stay exact, and a failure names the field path. Both constants are named and commented in `sim/snapshot.ts`; the tolerance is stated in [headless-runner.md](../dev/headless-runner.md).

## Considered options

- **Keep it exact and regenerate on every machine:** rejected. A snapshot would then only match on the machine that wrote it, and every regeneration is a noisy diff.
- **Round the numbers when writing the snapshot:** rejected. It hides noise in the file but not in the fresh run, which would still fail at a rounding boundary, and the committed state would no longer be a true state of the plant.
- **A tighter tolerance of 1e-9 (the first choice):** rejected on 2026-11-12. `turbine-sync`, `turbine-runup` and `bypass-loop` differed by about 3e-9 relative in `Deaerator.ventedTotal` between the `tsx` snapshot writer and the vitest run, so the test failed on a `dev` with no physics change. Chasing that was not worth it for a one-person project; the scenario goal checks cover physics.

## Consequences

- A physics change that moves a snapshot field by less than 1e-6 relative is not caught by the snapshot test. The scenario goal checks and invariants cover physics; the snapshot test only guards against a stale file.
- Below a magnitude of 1e-6 the absolute floor wins, so a field around 1e-9 is compared at only about 1e-3 relative. Plant fields are mostly far larger; the floor exists for fields that sit at 0.
- Snapshots are still written exact by `pnpm sim:snapshots`, so regenerating after a real change is unchanged.
- Scenarios that start from a snapshot start from the committed digits, not a fresh run; the difference is noise-level.
