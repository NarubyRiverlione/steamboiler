import { readFileSync } from "node:fs"
import { describe, expect, test } from "vitest"
import { finalState } from "../scenario"
import { loadSnapshot, snapshotPath, toSnapshotJson, valueErrors } from "../snapshot"
import { snapshotSources } from "../snapshot-sources"

// A committed snapshot is the final state of its source scenario. After a physics or state change
// this fails: run `pnpm sim:snapshots` and commit the regenerated files (numbers compare with a tolerance, ADR 0020).
describe.each(Object.entries(snapshotSources))("snapshot %s", (name, scenario) => {
  const fresh = finalState(scenario) // one run for both tests: the longest scenarios take tens of seconds

  test(`matches a fresh run of ${scenario.name} (pnpm sim:snapshots to regenerate)`, () => {
    const committed: unknown = JSON.parse(readFileSync(snapshotPath(name), "utf8"))
    // The JSON round trip gives the fresh state the same form as the file (NaN and Infinity become null).
    expect(valueErrors(JSON.parse(toSnapshotJson(fresh)), committed)).toEqual([])
  })

  test("loads", () => {
    expect(valueErrors(fresh, loadSnapshot(name))).toEqual([])
  })
})
