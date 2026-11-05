# The runner speed guard is its own opt-in layer, outside the dev gate

The wall-clock guard on the headless runner (one simulated hour under a time limit) sat in the golden layer of [ADR 0016](0016-scenario-definition-and-test-layers.md). A wall-clock limit depends on the machine: on a slower one it timed out and blocked the merge into `dev`, with no fault in the change being merged. Ticket #73. This supersedes the three layers of ADR 0016 with four; the rest of ADR 0016 stands.

The guard moves to `sim/perf/`, with its own `vitest.perf.config.ts` and script `test:perf`. It runs at the `dev` → `main` gate and as a step in CI, not at the merge into `dev`.

## Considered options

- **A fourth Vitest project in `vite.config.ts`:** rejected. Every project runs in a plain `vitest run`, so the guard would stay in `pnpm test` and in the coverage run of the crap report, which is part of the `dev` gate and the slowest case.
- **A project added only when an environment variable is set:** rejected. Setting a variable in a `package.json` script differs per shell, and a separate config says the same with less logic.
- **Only raise the limit:** rejected. A limit loose enough for every machine catches nothing, and the guard would still decide a merge on hardware speed.

## Consequences

- `pnpm test` and a coverage run no longer run the guard; `pnpm test:perf` does. A slowdown shows at the latest on the pull request into `main`, and earlier in CI on a push to `dev`, where it is reported but blocks nothing.
- `ci.yml` needs the separate step, because `pnpm test` no longer covers the guard.
