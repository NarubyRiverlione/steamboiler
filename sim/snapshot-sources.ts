import { SnapshotSources } from "./snapshot-writer"

// Every committed snapshot and the scenario whose final state it is. `pnpm sim:snapshots` rewrites them all; a test
// fails when a committed file no longer matches its source. A source starts from cold or from an earlier source listed
// before it (`turbine-sync` from `turbine-runup`). Each source is a loader, called only after the snapshots before it
// are written: the scenario file reads its parent snapshot when it is imported, so a static import would read it stale.
export const snapshotSources: SnapshotSources = {
  "turbine-runup": async () => (await import("./scenarios/turbine-runup")).turbineRunup,
  "turbine-sync": async () => (await import("./scenarios/turbine-sync")).turbineSync,
  "bypass-loop": async () => (await import("./scenarios/bypass-loop")).bypassLoop,
}
