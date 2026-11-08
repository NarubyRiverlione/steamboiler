import { describe, expect, test } from "vitest"
import { loadSnapshot } from "../../sim/snapshot"
import { makeInitialState, powerPlantReducer } from "./PowerPlantReducer"
import type PowerPlantState from "./PowerPlantState"
import { START_PRESETS, presetState, validatedState, type StartPreset } from "./startPresets"

const find = (id: string): StartPreset => {
  const preset: StartPreset | undefined = START_PRESETS.find((p: StartPreset) => p.id === id)
  if (preset === undefined) throw new Error(`no preset ${id}`)
  return preset
}

describe("start presets", () => {
  test("lists Cold & dark first, then Hot standby and At pressure", () => {
    expect(START_PRESETS.map((p: StartPreset) => p.label)).toEqual(["Cold & dark", "Hot standby", "At pressure"])
    expect(START_PRESETS.every((p: StartPreset) => p.description.length > 0)).toBe(true)
  })

  test("Cold & dark is the cold initial state", () => {
    expect(presetState(find("cold"))).toEqual(makeInitialState())
  })

  test("Hot standby is the bypass-loop snapshot, At pressure the turbine-runup snapshot", () => {
    expect(presetState(find("hot-standby"))).toEqual(loadSnapshot("bypass-loop"))
    expect(presetState(find("at-pressure"))).toEqual(loadSnapshot("turbine-runup"))
  })

  test("a snapshot whose shape no longer matches the current state is rejected", () => {
    const stale: unknown = { ...makeInitialState(), Heater: undefined }
    expect(() => validatedState("stale", stale)).toThrow(/Preset "stale" does not match PowerPlantState/)
    expect(() => validatedState("ok", makeInitialState())).not.toThrow()
  })

  test.each(START_PRESETS.map((p: StartPreset) => p.id))("the tick continues from %s without NaN", (id: string) => {
    let state: PowerPlantState = presetState(find(id))
    for (let i = 0; i < 20; i++) state = powerPlantReducer(state, { type: "SIMULATE_TICK" })
    const bad: string[] = []
    const walk = (value: unknown, path: string): void => {
      if (typeof value === "number" && !Number.isFinite(value)) bad.push(path)
      else if (typeof value === "object" && value !== null)
        Object.entries(value).forEach(([k, v]) => { walk(v, `${path}.${k}`) })
    }
    walk(state, "state")
    expect(bad).toEqual([])
    expect(state.Boiler.waterVolume).toBeGreaterThan(0)
  })
})
