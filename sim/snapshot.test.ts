import { readFileSync, rmSync } from "node:fs"
import { describe, expect, test } from "vitest"
import { finalState } from "./scenario"
import { loadSnapshot, parseSnapshot, saveSnapshot, shapeErrors, snapshotPath, toSnapshotJson } from "./snapshot"
import { snapshotSources } from "./snapshot-sources"
import { makeInitialState } from "../src/context/PowerPlantReducer"

describe("snapshot JSON", () => {
  const cold = makeInitialState()

  test("round-trips a full plant state exactly", () => {
    const state = finalState(snapshotSources["at-pressure"])
    expect(parseSnapshot(toSnapshotJson(state), "test")).toEqual(state)
  })

  test("saves to sim/snapshots and loads back", () => {
    const path = saveSnapshot("test-save", cold)
    try {
      expect(path).toBe(snapshotPath("test-save"))
      expect(loadSnapshot("test-save")).toEqual(cold)
    } finally {
      rmSync(path)
    }
  })

  test("accepts the current state shape", () => {
    expect(shapeErrors(cold, cold)).toEqual([])
  })

  test("rejects missing, unexpected and mistyped fields", () => {
    const turbine: Record<string, unknown> = { ...cold.Turbine, spin: 1 }
    delete turbine.rpm
    const wrong = { ...cold, Turbine: turbine, Boiler: { ...cold.Boiler, pressure: "1" } }
    expect(shapeErrors(cold, wrong)).toEqual([
      "state.Boiler.pressure: expected number, got string",
      "state.Turbine.rpm: missing",
      "state.Turbine.spin: unexpected",
    ])
    expect(() => parseSnapshot(JSON.stringify(wrong), "wrong")).toThrow(/Snapshot "wrong" does not match/)
  })

  test("rejects a part of the wrong kind", () => {
    expect(shapeErrors(cold, { ...cold, Condenser: null })).toEqual(["state.Condenser: expected object, got null"])
    expect(shapeErrors(cold, { ...cold, Condenser: [] })).toEqual(["state.Condenser: expected object, got array"])
  })
})

// A committed snapshot is the final state of its source scenario. After a physics or state change
// this fails: run `pnpm sim:snapshots` and commit the regenerated files.
describe.each(Object.entries(snapshotSources))("snapshot %s", (name, scenario) => {
  test(`matches a fresh run of ${scenario.name} (pnpm sim:snapshots to regenerate)`, () => {
    expect(readFileSync(snapshotPath(name), "utf8")).toBe(toSnapshotJson(finalState(scenario)))
  })

  test("loads", () => {
    expect(loadSnapshot(name)).toEqual(finalState(scenario))
  })
})
