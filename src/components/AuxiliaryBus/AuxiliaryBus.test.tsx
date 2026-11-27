import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { ContextType } from "react"
import { PowerPlantContext } from "../../context/PowerPlantContext"
import { makeInitialState } from "../../context/PowerPlantReducer"
import type PowerPlantState from "../../context/PowerPlantState"
import AuxiliaryBus from "./AuxiliaryBus"

type Ctx = ContextType<typeof PowerPlantContext>

function renderPage(patch: Partial<PowerPlantState> = {}, unitAuxBreaker = false, rpm = 3000) {
  const state: PowerPlantState = { ...makeInitialState(), ...patch }
  state.Turbine = { ...state.Turbine, unitAuxBreaker, rpm }
  const fns = { toggleGridSupplyBreaker: vi.fn(), toggleUnitAuxBreaker: vi.fn() }
  render(
    <PowerPlantContext.Provider value={{ state, dispatch: vi.fn(), ...fns } as unknown as Ctx}>
      <AuxiliaryBus />
    </PowerPlantContext.Provider>,
  )
  return fns
}

const liftCover = (name: string): HTMLElement => {
  fireEvent.click(screen.getByRole("switch", { name: `${name}, cover down` }))
  return screen.getByRole("switch", { name: `${name}, cover up` })
}

describe("Auxiliary bus page", () => {
  it("toggles the grid supply breaker through its cover, never disabled", () => {
    const fns = renderPage()
    const breaker: HTMLElement = liftCover("Grid supply breaker")
    expect(breaker.getAttribute("aria-disabled")).toBeNull()
    expect(breaker.getAttribute("aria-checked")).toBe("true")
    fireEvent.click(breaker)
    expect(fns.toggleGridSupplyBreaker).toHaveBeenCalledTimes(1)
  })

  it("is not disabled with the grid supply breaker open", () => {
    renderPage({ gridSupplyBreaker: false })
    expect(liftCover("Grid supply breaker").getAttribute("aria-disabled")).toBeNull()
  })

  it("lights Auxiliary bus live exactly while a breaker feeds the bus", () => {
    renderPage({ gridSupplyBreaker: false }, false)
    expect(screen.getByRole("img", { name: "Auxiliary bus live: off" })).toBeTruthy()
  })

  it("keeps the bus live on the unit aux breaker alone", () => {
    renderPage({ gridSupplyBreaker: false }, true)
    expect(screen.getByRole("img", { name: "Auxiliary bus live: on" })).toBeTruthy()
  })

  it("toggles the unit aux breaker through its cover inside the sync window", () => {
    const fns = renderPage()
    const breaker: HTMLElement = liftCover("Unit aux breaker")
    expect(breaker.getAttribute("aria-disabled")).toBeNull()
    expect(breaker.getAttribute("aria-checked")).toBe("false")
    fireEvent.click(breaker)
    expect(fns.toggleUnitAuxBreaker).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("img", { name: "Ready to close: on" })).toBeTruthy()
  })

  it("blocks closing the unit aux breaker outside the sync window, with the reason", () => {
    renderPage({}, false, 1500)
    expect(liftCover("Unit aux breaker").getAttribute("aria-disabled")).toBe("true")
    expect(screen.getByRole("img", { name: "Ready to close: off" })).toBeTruthy()
    expect(screen.getByText("Speed is outside the synchronising window")).toBeTruthy()
  })

  it("shows the auxiliary load in MW", () => {
    renderPage({ auxiliaryLoad: 3.456 })
    expect(screen.getByLabelText("Auxiliary load").textContent).toBe("3.5 MW")
  })

  it("has no UPS group any more (#196): it lives on the Emergency power page", () => {
    renderPage()
    expect(screen.queryByRole("meter", { name: "UPS charge" })).toBeNull()
    expect(screen.queryByRole("img", { name: "Control power: on" })).toBeNull()
  })
})
