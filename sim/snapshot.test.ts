import { rmSync } from "node:fs"
import { describe, expect, test } from "vitest"
import {
  loadSnapshot,
  parseSnapshot,
  saveSnapshot,
  shapeErrors,
  snapshotPath,
  toSnapshotJson,
  valueErrors,
} from "./snapshot"
import { makeInitialState, powerPlantReducer } from "../src/context/PowerPlantReducer"

describe("snapshot JSON", () => {
  const cold = makeInitialState()

  test("round-trips a full plant state exactly", () => {
    const state = powerPlantReducer(cold, { type: "SET_GAS_RATE", payload: { gasRateCommand: 0.5 } })
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

describe("valueErrors", () => {
  const cold = makeInitialState()

  test("finds no difference between equal trees", () => {
    expect(valueErrors(cold, structuredClone(cold))).toEqual([])
  })

  test("passes noise of 1e-12 relative", () => {
    const noisy = { ...cold, Boiler: { ...cold.Boiler, pressure: 165e5 } }
    expect(
      valueErrors(noisy, { ...noisy, Boiler: { ...noisy.Boiler, pressure: 165e5 * (1 + 1e-12) } }),
    ).toEqual([])
  })

  test("fails a 1e-6 relative change and names the field", () => {
    const base = { ...cold, Boiler: { ...cold.Boiler, pressure: 165e5 } }
    const moved = { ...base, Boiler: { ...base.Boiler, pressure: 165e5 * (1 + 1e-6) } }
    expect(valueErrors(base, moved)).toEqual([expect.stringMatching(/^state\.Boiler\.pressure: /)])
  })

  test("uses the absolute floor for values near 0", () => {
    expect(valueErrors({ x: 0 }, { x: 1e-15 })).toEqual([])
    expect(valueErrors({ x: 1e-15 }, { x: 0 })).toEqual([])
    expect(valueErrors({ x: 0 }, { x: 1e-9 })).toEqual(["state.x: expected 0, got 1e-9"])
  })

  test("is symmetric and checks relative size just outside the tolerance", () => {
    expect(valueErrors({ x: 100 }, { x: 100 * (1 + 2e-9) })).toHaveLength(1)
    expect(valueErrors({ x: 100 * (1 + 2e-9) }, { x: 100 })).toHaveLength(1)
    expect(valueErrors({ x: 100 }, { x: 100 * (1 + 5e-10) })).toEqual([])
  })

  test("keeps shape, strings, booleans, null and arrays exact", () => {
    expect(valueErrors({ a: true }, { a: false })).toEqual(["state.a: expected true, got false"])
    expect(valueErrors({ a: "x" }, { a: "y" })).toEqual(["state.a: expected x, got y"])
    expect(valueErrors({ a: 1 }, { a: "1" })).toEqual(["state.a: expected number, got string"])
    expect(valueErrors({ a: 1 }, {})).toEqual(["state.a: missing"])
    expect(valueErrors({ a: 1 }, { a: 1, b: 2 })).toEqual(["state.b: unexpected"])
    expect(valueErrors({ a: null }, { a: 0 })).toEqual(["state.a: expected null, got number"])
    expect(valueErrors({ a: [1, 2] }, { a: [1, 2 + 1e-3] })).toEqual(["state.a[1]: expected 2, got 2.001"])
    expect(valueErrors({ a: [1] }, { a: [1, 2] })).toEqual(["state.a: expected length 1, got 2"])
  })

  test("handles negative numbers, opposite signs, NaN and mismatched containers", () => {
    expect(valueErrors({ x: -100 }, { x: -100 * (1 + 1e-12) })).toEqual([])
    expect(valueErrors({ x: -1 }, { x: 1 })).toEqual(["state.x: expected -1, got 1"])
    expect(valueErrors({ x: NaN }, { x: NaN })).toEqual(["state.x: expected NaN, got NaN"])
    expect(valueErrors({ x: {} }, { x: null })).toEqual(["state.x: expected object, got null"])
    expect(valueErrors({ x: {} }, { x: [] })).toEqual(["state.x: expected object, got array"])
  })
})
