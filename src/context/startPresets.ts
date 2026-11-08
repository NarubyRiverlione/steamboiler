/** The start states the operator can pick in the Presets popup (#24): the cold initial state or a committed snapshot. */

import bypassLoop from "../../sim/snapshots/bypass-loop.json"
import turbineRunup from "../../sim/snapshots/turbine-runup.json"
import { shapeErrors } from "../utils/stateShape"
import { makeInitialState } from "./PowerPlantReducer"
import type PowerPlantState from "./PowerPlantState"

export type StartPreset = {
  readonly id: string
  readonly label: string
  readonly description: string
  // Produces a fresh state each time; a snapshot is validated against the current state shape
  readonly source: () => PowerPlantState
}

// Throws when a snapshot no longer has the shape of the current PowerPlantState, so a stale one is never loaded
export function validatedState(name: string, json: unknown): PowerPlantState {
  const errors: string[] = shapeErrors(makeInitialState(), json)
  if (errors.length > 0) throw new Error(`Preset "${name}" does not match PowerPlantState:\n  ${errors.join("\n  ")}`)
  return structuredClone(json) as PowerPlantState
}

export const START_PRESETS: readonly StartPreset[] = [
  { id: "cold", label: "Cold & dark", description: "Everything at ambient, all pumps, valves and gas off.", source: makeInitialState },
  {
    id: "hot-standby",
    label: "Hot standby",
    description: "165 bar, turbine standing still, steam loop settled through the bypass.",
    source: (): PowerPlantState => validatedState("bypass-loop", bypassLoop),
  },
  {
    id: "at-pressure",
    label: "At pressure",
    description: "Turbine held at 3000 rpm, generator breaker open.",
    source: (): PowerPlantState => validatedState("turbine-runup", turbineRunup),
  },
]

export const presetState = (preset: StartPreset): PowerPlantState => preset.source()
