import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { ContextType } from "react"
import { PowerPlantContext } from "../../context/PowerPlantContext"
import { makeInitialState } from "../../context/PowerPlantReducer"
import type PowerPlantState from "../../context/PowerPlantState"
import AuxiliaryBus from "./AuxiliaryBus"
import { UpsGroup } from "./UpsGroup"

type Ctx = ContextType<typeof PowerPlantContext>

function renderPage(patch: Partial<PowerPlantState> = {}, generatorBreaker = false) {
  const state: PowerPlantState = { ...makeInitialState(), ...patch }
  state.Turbine = { ...state.Turbine, generatorBreaker }
  const fns = { toggleGridSupplyBreaker: vi.fn(), toggleUpsBreaker: vi.fn() }
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

  it("is not disabled with the grid supply breaker open and no control power either", () => {
    renderPage({ gridSupplyBreaker: false, upsBreaker: false })
    const breaker: HTMLElement = liftCover("Grid supply breaker")
    expect(breaker.getAttribute("aria-disabled")).toBeNull()
    expect(screen.getByRole("img", { name: "Control power: off" })).toBeTruthy()
  })

  it("lights Auxiliary bus live exactly while a breaker feeds the bus", () => {
    renderPage({ gridSupplyBreaker: false }, false)
    expect(screen.getByRole("img", { name: "Auxiliary bus live: off" })).toBeTruthy()
  })

  it("keeps the bus live on the generator breaker alone", () => {
    renderPage({ gridSupplyBreaker: false }, true)
    expect(screen.getByRole("img", { name: "Auxiliary bus live: on" })).toBeTruthy()
  })

  it("shows the auxiliary load in MW", () => {
    renderPage({ auxiliaryLoad: 3.456 })
    expect(screen.getByLabelText("Auxiliary load").textContent).toBe("3.5 MW")
  })

  it("toggles the battery breaker, shows the charge and follows the safety bus", () => {
    const fns = renderPage({ upsBreaker: true, upsCharge: 64 })
    expect(screen.getByRole("meter", { name: "UPS charge" }).getAttribute("aria-valuenow")).toBe("64")
    expect(screen.getByRole("img", { name: "Control power: on" })).toBeTruthy()
    fireEvent.click(liftCover("Battery breaker"))
    expect(fns.toggleUpsBreaker).toHaveBeenCalledTimes(1)
  })

  it("has Control power off with a dead Auxiliary bus and the battery breaker open or the charge empty", () => {
    renderPage({ gridSupplyBreaker: false, upsBreaker: false, upsCharge: 100 }, false)
    expect(screen.getByRole("img", { name: "Control power: off" })).toBeTruthy()
  })

  it("has Control power on from the Auxiliary bus with the battery breaker open (#190)", () => {
    renderPage({ upsBreaker: false })
    expect(screen.getByRole("img", { name: "Control power: on" })).toBeTruthy()
  })
})

describe("UpsGroup", () => {
  it("renders on its own with the state and one callback", () => {
    const onToggle = vi.fn()
    render(<UpsGroup state={{ ...makeInitialState(), gridSupplyBreaker: false, upsCharge: 0 }} onToggleUpsBreaker={onToggle} />)
    expect(screen.getByRole("img", { name: "Control power: off" })).toBeTruthy()
    fireEvent.click(liftCover("Battery breaker"))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})
