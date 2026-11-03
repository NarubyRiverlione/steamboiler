import { readFileSync } from "node:fs"
import { describe, expect, test } from "vitest"
import { finalState } from "../scenario"
import { loadSnapshot, snapshotPath, toSnapshotJson } from "../snapshot"
import { snapshotSources } from "../snapshot-sources"

// A committed snapshot is the final state of its source scenario. After a physics or state change
// this fails: run `pnpm sim:snapshots` and commit the regenerated files.
describe.each(Object.entries(snapshotSources))("snapshot %s", (name, scenario) => {
  const fresh = finalState(scenario) // one run for both tests: the longest scenarios take tens of seconds

  test(`matches a fresh run of ${scenario.name} (pnpm sim:snapshots to regenerate)`, () => {
    expect(readFileSync(snapshotPath(name), "utf8")).toBe(toSnapshotJson(fresh))
  })

  test("loads", () => {
    expect(loadSnapshot(name)).toEqual(fresh)
  })
})
