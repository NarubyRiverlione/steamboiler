import { describe, expect, it } from "vitest"
import { makeInitialState } from "../context/PowerPlantReducer"
import type PowerPlantState from "../context/PowerPlantState"
import { deriveBoardState } from "./boardState"

// vital = Auxiliary bus live (grid supply breaker); safety = UPS breaker closed with charge left
const plant = (vital: boolean, safety: boolean, ended = false): PowerPlantState => ({
  ...makeInitialState(),
  gridSupplyBreaker: vital,
  upsBreaker: safety,
  upsCharge: 50,
  simulationEnded: ended,
})

describe("deriveBoardState", () => {
  it.each([
    [true, true, "normal"],
    [true, false, "normal"],
    [false, true, "emergency"],
    [false, false, "dark"],
  ] as const)("vital %s, safety %s gives %s", (vital, safety, expected) => {
    expect(deriveBoardState(plant(vital, safety))).toBe(expected)
  })

  it("is ended whatever the buses say", () => {
    for (const vital of [true, false]) for (const safety of [true, false]) expect(deriveBoardState(plant(vital, safety, true))).toBe("ended")
  })

  it("is dark with the UPS breaker closed but the charge at 0", () => {
    expect(deriveBoardState({ ...plant(false, true), upsCharge: 0 })).toBe("dark")
  })
})
