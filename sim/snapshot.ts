import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { makeInitialState } from "../src/context/PowerPlantReducer"
import PowerPlantState from "../src/context/PowerPlantState"
import { shapeErrors } from "../src/utils/stateShape"

// Committed snapshots: plain PowerPlantState JSON, one file per name.
const SnapshotDir = fileURLToPath(new URL("./snapshots/", import.meta.url))

export const snapshotPath = (name: string) => `${SnapshotDir}${name}.json`

export const toSnapshotJson = (state: PowerPlantState) => `${JSON.stringify(state, null, 2)}\n`

export { shapeErrors }

// Relative tolerance of the larger magnitude: well above the noise between machines and runners (ADR 0020).
const RelativeTolerance = 1e-6
// Absolute tolerance for values near 0, where a relative one would fail on noise.
const AbsoluteFloor = 1e-12
// The magnitude below which the absolute floor wins over the relative tolerance.
const FloorMagnitude = AbsoluteFloor / RelativeTolerance

const nearlyEqual = (a: number, b: number): boolean =>
  Math.abs(a - b) <= RelativeTolerance * Math.max(Math.abs(a), Math.abs(b), FloorMagnitude)

const differs = (path: string, expected: unknown, actual: unknown): string[] => [
  `${path}: expected ${String(expected)}, got ${String(actual)}`,
]

// Where two state trees differ in value: numbers within tolerance, shape, strings, booleans and null exact.
export function valueErrors(expected: unknown, actual: unknown, path = "state"): string[] {
  if (typeof expected === "number" && typeof actual === "number") {
    return nearlyEqual(expected, actual) ? [] : differs(path, expected, actual)
  }
  const shape: string[] = shapeErrors(expected, actual, path)
  if (shape.length > 0) return shape
  if (typeof expected !== "object" || expected === null) {
    return expected === actual ? [] : differs(path, expected, actual)
  }
  if (Array.isArray(expected)) {
    const items: unknown[] = actual as unknown[]
    const length: string[] =
      expected.length === items.length
        ? []
        : [`${path}: expected length ${String(expected.length)}, got ${String(items.length)}`]
    return [
      ...length,
      ...expected.slice(0, items.length).flatMap((v, i) => valueErrors(v, items[i], `${path}[${String(i)}]`)),
    ]
  }
  const want = expected as Record<string, unknown>
  const have = actual as Record<string, unknown>
  return Object.keys(want).flatMap((k) => valueErrors(want[k], have[k], `${path}.${k}`))
}

// Parses snapshot JSON and rejects anything that is not shaped like the current PowerPlantState.
export function parseSnapshot(json: string, name: string): PowerPlantState {
  const state: unknown = JSON.parse(json)
  const errors = shapeErrors(makeInitialState(), state)
  if (errors.length > 0) {
    throw new Error(`Snapshot "${name}" does not match PowerPlantState:\n  ${errors.join("\n  ")}`)
  }
  return state as PowerPlantState
}

export const loadSnapshot = (name: string) => parseSnapshot(readFileSync(snapshotPath(name), "utf8"), name)

export function saveSnapshot(name: string, state: PowerPlantState): string {
  const path = snapshotPath(name)
  mkdirSync(SnapshotDir, { recursive: true })
  writeFileSync(path, toSnapshotJson(state))
  return path
}
