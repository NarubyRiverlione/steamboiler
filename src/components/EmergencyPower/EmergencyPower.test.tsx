import { fireEvent, render, screen } from "@testing-library/react"
import type { ContextType } from "react"
import { describe, expect, it, vi } from "vitest"
import { PowerPlantContext } from "../../context/PowerPlantContext"
import { makeInitialState } from "../../context/PowerPlantReducer"
import type PowerPlantState from "../../context/PowerPlantState"
import EmergencyPower from "./EmergencyPower"

type Ctx = ContextType<typeof PowerPlantContext>

function renderPage(patch: Partial<PowerPlantState> = {}) {
  const state: PowerPlantState = { ...makeInitialState(), ...patch }
  const fns = { toggleVitalFeedBreaker: vi.fn(), toggleSafetyFeedBreaker: vi.fn() }
  render(
    <PowerPlantContext.Provider value={{ state, dispatch: vi.fn(), ...fns } as unknown as Ctx}>
      <EmergencyPower />
    </PowerPlantContext.Provider>,
  )
  return fns
}

const liftCover = (name: string): HTMLElement => {
  fireEvent.click(screen.getByRole("switch", { name: `${name}, cover down` }))
  return screen.getByRole("switch", { name: `${name}, cover up` })
}

describe("Emergency power page (#196)", () => {
  it("shows both breakers closed, the charge, Control power on and On battery off in the normal state", () => {
    renderPage({ upsCharge: 64 })
    expect(screen.getByRole("meter", { name: "UPS charge" }).getAttribute("aria-valuenow")).toBe("64")
    expect(screen.getByRole("img", { name: "Control power: on" })).toBeTruthy()
    expect(screen.getByRole("img", { name: "On battery: off" })).toBeTruthy()
    expect(liftCover("Aux to Vital breaker").getAttribute("aria-checked")).toBe("true")
  })

  it("toggles Aux→Vital through its cover", () => {
    const fns = renderPage()
    fireEvent.click(liftCover("Aux to Vital breaker"))
    expect(fns.toggleVitalFeedBreaker).toHaveBeenCalledTimes(1)
  })

  it("toggles Vital→Safety through its cover", () => {
    const fns = renderPage()
    fireEvent.click(liftCover("Vital to Safety breaker"))
    expect(fns.toggleSafetyFeedBreaker).toHaveBeenCalledTimes(1)
  })

  it("on battery after a grid loss: both breakers open, On battery lit, Control power on, closing refused", () => {
    renderPage({ gridSupplyBreaker: false, vitalFeedBreaker: false, safetyFeedBreaker: false })
    expect(screen.getByRole("img", { name: "On battery: on" })).toBeTruthy()
    expect(screen.getByRole("img", { name: "Control power: on" })).toBeTruthy()
    expect(liftCover("Aux to Vital breaker").getAttribute("aria-disabled")).toBe("true")
    expect(liftCover("Vital to Safety breaker").getAttribute("aria-disabled")).toBe("true")
  })

  it("with the Vital bus live and a flat battery Control power is off, and Vital→Safety is the way out", () => {
    renderPage({ safetyFeedBreaker: false, upsCharge: 0 })
    expect(screen.getByRole("img", { name: "Control power: off" })).toBeTruthy()
    expect(screen.getByRole("img", { name: "On battery: off" })).toBeTruthy()
    expect(liftCover("Vital to Safety breaker").getAttribute("aria-disabled")).toBeNull()
  })

  it("with the grid back and the hand-back not done, Aux→Vital closes and Vital→Safety does not", () => {
    renderPage({ vitalFeedBreaker: false, safetyFeedBreaker: false })
    expect(liftCover("Aux to Vital breaker").getAttribute("aria-disabled")).toBeNull()
    expect(liftCover("Vital to Safety breaker").getAttribute("aria-disabled")).toBe("true")
  })
})
