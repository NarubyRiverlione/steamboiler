import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, useLocation } from "react-router-dom"
import { describe, expect, it } from "vitest"
import type { ContextType, ReactNode } from "react"
import { PowerPlantContext } from "../context/PowerPlantContext"
import { makeInitialState } from "../context/PowerPlantReducer"
import type PowerPlantState from "../context/PowerPlantState"
import Layout from "./Layout"
import { Route, Routes } from "react-router-dom"
import PlantOverview from "./PlantOverview"
import { neighbourPath, partAlarms } from "./plantParts"

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>
}

function renderAt(path: string, state: PowerPlantState = makeInitialState(), extra?: ReactNode) {
  const noop = (): void => undefined
  const value = { state, dispatch: noop } as unknown as ContextType<typeof PowerPlantContext>
  return render(
    <PowerPlantContext.Provider value={value}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<PlantOverview />} />
            <Route path="boiler" element={<p>boiler page</p>} />
            <Route path="condenser" element={<p>condenser page</p>} />
            <Route path="turbine" element={<p>turbine page</p>} />
          </Route>
        </Routes>
        <Where />
        {extra}
      </MemoryRouter>
    </PowerPlantContext.Provider>,
  )
}

const where = (): string | null => screen.getByTestId("where").textContent

describe("keyboard", () => {
  it("cycles Boiler, Condenser, Turbine with Page Down and Right, and back with Page Up and Left", () => {
    renderAt("/")
    fireEvent.keyDown(window, { key: "PageDown" })
    expect(where()).toBe("/boiler")
    fireEvent.keyDown(window, { key: "ArrowRight" })
    expect(where()).toBe("/condenser")
    fireEvent.keyDown(window, { key: "PageDown" })
    expect(where()).toBe("/turbine")
    fireEvent.keyDown(window, { key: "PageDown" })
    expect(where()).toBe("/boiler")
    fireEvent.keyDown(window, { key: "PageUp" })
    expect(where()).toBe("/turbine")
    fireEvent.keyDown(window, { key: "ArrowLeft" })
    expect(where()).toBe("/condenser")
  })

  it("returns to the overview on Esc", () => {
    renderAt("/turbine")
    fireEvent.keyDown(window, { key: "Escape" })
    expect(where()).toBe("/")
  })

  it("leaves the keys to a field or knob in use", () => {
    renderAt("/boiler", undefined, <input aria-label="field" />)
    fireEvent.keyDown(screen.getByLabelText("field"), { key: "ArrowRight", bubbles: true })
    fireEvent.keyDown(screen.getByLabelText("field"), { key: "Escape", bubbles: true })
    expect(where()).toBe("/boiler")
  })

  it("ignores keys with a modifier", () => {
    renderAt("/boiler")
    fireEvent.keyDown(window, { key: "ArrowRight", ctrlKey: true })
    expect(where()).toBe("/boiler")
  })
})

describe("header", () => {
  it("lights the Plant overview button on the overview only", () => {
    renderAt("/")
    expect(screen.getByRole("link", { name: "Plant overview" }).getAttribute("aria-current")).toBe("page")
    fireEvent.keyDown(window, { key: "PageDown" })
    const links: HTMLElement[] = screen.getAllByRole("link", { name: "Plant overview" })
    expect(links.some((link: HTMLElement) => link.getAttribute("aria-current") === "page")).toBe(false)
  })

  it("shows the breadcrumb of the open part and has no tab strip", () => {
    renderAt("/condenser")
    expect(screen.getByRole("navigation", { name: "Breadcrumb" }).textContent).toContain("Condenser")
    expect(screen.queryByRole("link", { name: "Turbine" })).toBeNull()
  })
})

describe("plant overview", () => {
  it("opens a part by clicking it", () => {
    renderAt("/")
    fireEvent.click(screen.getByRole("link", { name: "Turbine, opens Turbine" }))
    expect(where()).toBe("/turbine")
  })

  it("shows the extraction heater and the air preheater without a link", () => {
    renderAt("/")
    expect(screen.getByText("Extraction heater")).toBeTruthy()
    expect(screen.queryByRole("link", { name: /Extraction heater/ })).toBeNull()
    expect(screen.queryByRole("link", { name: /Air preheater/ })).toBeNull()
  })

  it("lights a part's LED from its alarm flags", () => {
    const state: PowerPlantState = makeInitialState()
    state.Turbine.turbineTripped = true
    renderAt("/", state)
    expect(screen.getByRole("img", { name: "Turbine alarm: on" })).toBeTruthy()
    expect(screen.getByRole("img", { name: "Boiler alarm: off" })).toBeTruthy()
    expect(screen.getByRole("img", { name: "Condenser alarm: off" })).toBeTruthy()
  })
})

describe("partAlarms", () => {
  it("raises each part from any of its flags", () => {
    const state: PowerPlantState = makeInitialState()
    state.Boiler.burnerTripped = true
    state.Condenser.condensationPumpTripped = true
    expect(partAlarms(state)).toEqual({ boiler: true, condenser: true, turbine: false })
    state.Boiler.burnerTripped = false
    state.Boiler.heatingRateOverLimit = true
    expect(partAlarms(state).boiler).toBe(true)
  })
})

describe("neighbourPath", () => {
  it("steps into the ends from an unknown path", () => {
    expect(neighbourPath("/", 1)).toBe("/boiler")
    expect(neighbourPath("/", -1)).toBe("/turbine")
  })
})
