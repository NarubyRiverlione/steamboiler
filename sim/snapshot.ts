import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { makeInitialState } from "../src/context/PowerPlantReducer"
import PowerPlantState from "../src/context/PowerPlantState"

// Committed snapshots: plain PowerPlantState JSON, one file per name.
const SnapshotDir = fileURLToPath(new URL("./snapshots/", import.meta.url))

export const snapshotPath = (name: string) => `${SnapshotDir}${name}.json`

export const toSnapshotJson = (state: PowerPlantState) => `${JSON.stringify(state, null, 2)}\n`

// Where `value` differs in shape from `template`: missing or extra keys, or a different type.
export function shapeErrors(template: unknown, value: unknown, path = "state"): string[] {
  const kind = (v: unknown) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v)
  if (kind(template) !== kind(value)) return [`${path}: expected ${kind(template)}, got ${kind(value)}`]
  if (kind(template) !== "object") return []
  const want = template as Record<string, unknown>
  const got = value as Record<string, unknown>
  const missing = Object.keys(want).filter((k) => !Object.hasOwn(got, k)).map((k) => `${path}.${k}: missing`)
  const extra = Object.keys(got).filter((k) => !Object.hasOwn(want, k)).map((k) => `${path}.${k}: unexpected`)
  const nested = Object.keys(want)
    .filter((k) => Object.hasOwn(got, k))
    .flatMap((k) => shapeErrors(want[k], got[k], `${path}.${k}`))
  return [...missing, ...extra, ...nested]
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
  writeFileSync(path, toSnapshotJson(state))
  return path
}
