import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { ContextType } from "react"
import { PowerPlantContext } from "../../context/PowerPlantContext"
import { CstDeaerator, CstSimulation } from "../../context/const"
import { makeInitialState } from "../../context/PowerPlantReducer"
import type PowerPlantState from "../../context/PowerPlantState"
import type { TripId } from "../../context/tripReset"
import { TripResetButton } from "./TripResetButton"

type Ctx = ContextType<typeof PowerPlantContext>

const { CstBoiler, CstCondenser } = CstSimulation

function renderButton(trip: TripId, patch: (state: PowerPlantState) => void) {
  const state: PowerPlantState = makeInitialState()
  patch(state)
  const dispatch = vi.fn()
  render(
    <PowerPlantContext.Provider value={{ state, dispatch } as unknown as Ctx}>
      <TripResetButton trip={trip} label="trip" />
    </PowerPlantContext.Provider>,
  )
  return { dispatch, button: screen.getByRole<HTMLButtonElement>("button", { name: "RESET" }) }
}

// Per trip: latch the flag, with the cause still there and then gone
const cases: { trip: TripId; latch: (s: PowerPlantState) => void; cause: (s: PowerPlantState) => void }[] = [
  {
    trip: "burner",
    latch: (s) => { s.Boiler.burnerTripped = true },
    cause: (s) => { s.Boiler.waterVolume = 0 },
  },
  {
    trip: "boilerHighHigh",
    latch: (s) => { s.Boiler.boilerLevelHighTripped = true },
    cause: (s) => { s.Boiler.waterVolume = CstBoiler.TotalVolume * CstBoiler.HighHighLevel },
  },
  {
    trip: "feedPump",
    latch: (s) => { s.Deaerator.feedPumpTripped = true },
    cause: (s) => { s.Deaerator.waterVolume = CstDeaerator.TotalVolume * (CstDeaerator.LowLowLevel - 0.01) },
  },
  {
    trip: "condensationPump",
    latch: (s) => { s.Condenser.condensationPumpTripped = true },
    cause: (s) => { s.Condenser.hotwellWaterVolume = 0 },
  },
  {
    trip: "turbine",
    latch: (s) => { s.Turbine.turbineTripped = true; s.Condenser.pressure = 100 },
    cause: (s) => { s.Condenser.pressure = CstCondenser.VacuumLimit + 1 },
  },
]

describe("TripResetButton", () => {
  for (const { trip, latch, cause } of cases) {
    describe(trip, () => {
      it("is disabled while the trip is not set", () => {
        const { button } = renderButton(trip, () => undefined)
        expect(button.disabled).toBe(true)
      })

      it("is disabled while the trip is set and the cause holds, and says why", () => {
        const { button } = renderButton(trip, (s) => { latch(s); cause(s) })
        expect(button.disabled).toBe(true)
        expect(button.title).toMatch(/still/)
      })

      it("is enabled once the cause has gone and dispatches the reset for its trip", () => {
        const { button, dispatch } = renderButton(trip, latch)
        expect(button.disabled).toBe(false)
        fireEvent.click(button)
        expect(dispatch).toHaveBeenCalledWith({ type: "RESET_TRIP", payload: { trip } })
      })
    })
  }
})
