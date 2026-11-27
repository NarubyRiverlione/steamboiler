import { describe, expect, it } from "vitest"
import { makeInitialState } from "../context/PowerPlantReducer"
import type PowerPlantState from "../context/PowerPlantState"
import { deriveBoardState } from "./boardState"

// vital = Auxiliary bus live and Aux→Vital closed; otherwise the grid is lost and the chain opened
const plant = (vital: boolean, ended = false): PowerPlantState => ({
  ...makeInitialState(),
  gridSupplyBreaker: vital,
  vitalFeedBreaker: vital,
  safetyFeedBreaker: vital,
  upsCharge: 50,
  simulationEnded: ended,
})

describe("deriveBoardState (#196: normal, emergency, ended)", () => {
  it("is normal with the Vital bus live", () => {
    expect(deriveBoardState(plant(true))).toBe("normal")
  })

  it("is emergency with the Vital bus dead, the battery feeding", () => {
    expect(deriveBoardState(plant(false))).toBe("emergency")
  })

  it("is normal with the Vital bus live and a flat battery: the Safety bus is dead but the board is not", () => {
    expect(deriveBoardState({ ...plant(true), safetyFeedBreaker: false, upsCharge: 0 })).toBe("normal")
  })

  it("is ended whatever the buses say", () => {
    for (const vital of [true, false]) expect(deriveBoardState(plant(vital, true))).toBe("ended")
  })
})
