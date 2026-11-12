/**
 * One run per registered scenario, checked from that run alone (ADR 0016): `runChecked` runs the scenario once in its
 * own test file, `sim/<class>/<name>.test.ts`, and declares on those samples every invariant, the golden-only ones for
 * the golden path, and the stale-snapshot check when the scenario is a snapshot source. The file's goal checks use the
 * same run. `sim/scenario-files.test.ts` fails when a registered scenario has no such file.
 */
import { readFileSync } from "node:fs"
import { basename, dirname } from "node:path"
import { describe, expect, test } from "vitest"
import { goldenInvariants, Invariant, invariants } from "./invariants"
import { Run, runScenarioWithLifts, Scenario } from "./scenario"
import { goldenPath, scenarios } from "./scenarios"
import { loadSnapshot, snapshotPath, toSnapshotJson, valueErrors } from "./snapshot"
import { snapshotSources } from "./snapshot-sources"

// (scenario, invariant) pairs that fail today, with the ticket that fixes them. When that ticket
// lands the test.fails flips red: remove the entry so the pair guards as a normal test.
export const expectedFailures: Record<string, string> = {
}

export type ScenarioClass = "golden" | "edge"

export const classOf = (scenario: Scenario): ScenarioClass =>
  goldenPath.some((s) => s.name === scenario.name) ? "golden" : "edge"

// The registered scenario, unchanged: invariants judge only a run that `pnpm sim` would also make
function assertRegistered(scenario: Scenario): void {
  if (scenarios[scenario.name] !== scenario)
    throw new Error(`"${scenario.name}" is not the registered scenario object; pass it unchanged (only sampleEvery may differ)`)
}

// Each scenario runs in its own file, so a scenario without one is caught by sim/scenario-files.test.ts
function assertOwnFile(scenario: Scenario): void {
  const path: string = expect.getState().testPath ?? ""
  const expected = `${classOf(scenario)}/${scenario.name}.test.ts`
  if (`${basename(dirname(path))}/${basename(path)}` !== expected)
    throw new Error(`"${scenario.name}" is checked in ${path}; it belongs in sim/${expected}`)
}

function describeInvariants(scenario: Scenario, run: Run): void {
  const all: Invariant[] = classOf(scenario) === "golden" ? [...invariants, ...goldenInvariants] : invariants
  describe(`${scenario.name} invariants`, () => {
    for (const invariant of all) {
      const ticket = expectedFailures[`${scenario.name} / ${invariant.name}`] as string | undefined
      if (ticket === undefined)
        test(invariant.name, () => {
          expect(invariant.check(run.samples)).toEqual([])
        })
      else
        test.fails(`${invariant.name} (fails until ${ticket})`, () => {
          expect(invariant.check(run.samples)).toEqual([])
        })
    }
  })
}

// A committed snapshot is the final state of its source scenario. After a physics or state change this fails:
// run `pnpm sim:snapshots` and commit the regenerated files (numbers compare with a tolerance, ADR 0020).
function describeSnapshot(name: string, run: Run): void {
  describe(`snapshot ${name}`, () => {
    test(`matches a fresh run of ${name} (pnpm sim:snapshots to regenerate)`, () => {
      const committed: unknown = JSON.parse(readFileSync(snapshotPath(name), "utf8"))
      // The JSON round trip gives the fresh state the same form as the file (NaN and Infinity become null).
      expect(valueErrors(JSON.parse(toSnapshotJson(run.final)), committed)).toEqual([])
    })

    test("loads", () => {
      expect(valueErrors(run.final, loadSnapshot(name))).toEqual([])
    })
  })
}

// Runs the registered scenario once, sampled every `sampleEvery` sim-seconds if given (finer sampling only makes the
// invariants stricter), declares its invariant and snapshot checks, and returns the run for the goal checks
export function runChecked(scenario: Scenario, options: { sampleEvery?: number } = {}): Run {
  assertRegistered(scenario)
  assertOwnFile(scenario)
  const run: Run = runScenarioWithLifts({ ...scenario, sampleEvery: options.sampleEvery ?? scenario.sampleEvery })
  describeInvariants(scenario, run)
  if (snapshotSources[scenario.name] === scenario) describeSnapshot(scenario.name, run)
  return run
}
