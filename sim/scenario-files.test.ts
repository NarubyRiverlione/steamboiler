import { existsSync, readFileSync } from "node:fs"
import { describe, expect, test } from "vitest"
import { classOf, runChecked } from "./scenario-checks"
import { goldenPath, scenarios } from "./scenarios"
import { bypassLoop } from "./scenarios/bypass-loop"
import { snapshotSources } from "./snapshot-sources"

// Each registered scenario runs once, in its own file, under every invariant (ADR 0016). `runChecked` refuses to run
// anywhere but that file, so a file that exists and calls it checks that scenario; this guards that the file exists.
test("every registered scenario has its own test file that runs it under the invariants", () => {
  const missing: string[] = Object.values(scenarios)
    .map((scenario) => `sim/${classOf(scenario)}/${scenario.name}.test.ts`)
    .filter((path) => !existsSync(path) || !readFileSync(path, "utf8").includes("runChecked("))
  expect(missing).toEqual([])
})

describe("runChecked", () => {
  test("refuses a scenario that is not the registered object, so the invariants never judge an unregistered run", () => {
    expect(() => runChecked({ ...bypassLoop })).toThrow(/not the registered scenario/)
  })

  test("refuses to run outside the scenario's own file", () => {
    expect(() => runChecked(bypassLoop)).toThrow(/belongs in sim\/golden\/bypass-loop\.test\.ts/)
  })

  test("classes the golden path as golden and every other scenario as edge", () => {
    for (const scenario of Object.values(scenarios))
      expect(classOf(scenario)).toBe(goldenPath.includes(scenario) ? "golden" : "edge")
  })
})

test("every snapshot source is a registered scenario under its own name, so its file checks the snapshot", () => {
  for (const [name, scenario] of Object.entries(snapshotSources)) expect(scenarios[name]).toBe(scenario)
})
