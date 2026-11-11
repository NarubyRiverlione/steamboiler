import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, useLocation } from "react-router-dom"
import { describe, expect, it } from "vitest"
import type { ContextType, ReactNode } from "react"
import { PowerPlantContext } from "../context/PowerPlantContext"
import { makeInitialState } from "../context/PowerPlantReducer"
import type PowerPlantState from "../context/PowerPlantState"
import Layout from "./Layout"
import { Route, Routes } from "react-router-dom"
import PlantOverview from "./PlantOverview"
import AppRoutes from "./AppRoutes"
import PowerPlantProvider from "../context/PowerPlantProvider"
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
            <Route path="deaerator" element={<p>deaerator page</p>} />
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
  it("cycles Boiler, Deaerator, Condenser, Turbine with Page Down and Right, and back with Page Up and Left", () => {
    renderAt("/")
    fireEvent.keyDown(window, { key: "PageDown" })
    expect(where()).toBe("/boiler")
    fireEvent.keyDown(window, { key: "ArrowRight" })
    expect(where()).toBe("/deaerator")
    fireEvent.keyDown(window, { key: "PageDown" })
    expect(where()).toBe("/condenser")
    fireEvent.keyDown(window, { key: "PageDown" })
    expect(where()).toBe("/turbine")
    fireEvent.keyDown(window, { key: "PageDown" })
    expect(where()).toBe("/boiler")
    fireEvent.keyDown(window, { key: "PageUp" })
    expect(where()).toBe("/turbine")
    fireEvent.keyDown(window, { key: "ArrowLeft" })
    expect(where()).toBe("/condenser")
    fireEvent.keyDown(window, { key: "PageUp" })
    expect(where()).toBe("/deaerator")
  })

  it("returns to the overview on Esc", () => {
    renderAt("/turbine")
    fireEvent.keyDown(window, { key: "Escape" })
    expect(where()).toBe("/")
  })

  it("leaves the keys to a field in use", () => {
    renderAt("/boiler", undefined, <input aria-label="field" />)
    fireEvent.keyDown(screen.getByLabelText("field"), { key: "ArrowRight", bubbles: true })
    fireEvent.keyDown(screen.getByLabelText("field"), { key: "Escape", bubbles: true })
    expect(where()).toBe("/boiler")
  })

  it("lets Left and Right change the page from a focused knob", () => {
    renderAt("/boiler", undefined, <div role="slider" tabIndex={0} aria-label="knob" aria-valuenow={0} />)
    fireEvent.keyDown(screen.getByRole("slider", { name: "knob" }), { key: "ArrowRight", bubbles: true })
    expect(where()).toBe("/deaerator")
  })

  it("leaves the arrows to a focused button but not Esc", () => {
    renderAt("/boiler", undefined, <button>Open</button>)
    fireEvent.keyDown(screen.getByRole("button", { name: "Open" }), { key: "ArrowRight", bubbles: true })
    expect(where()).toBe("/boiler")
    fireEvent.keyDown(screen.getByRole("button", { name: "Open" }), { key: "Escape", bubbles: true })
    expect(where()).toBe("/")
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

  it("shows the deaerator's temperature and level, and its page link", () => {
    const state: PowerPlantState = makeInitialState()
    state.Deaerator.temperature = 133.5
    state.Deaerator.waterVolume = 75_000
    renderAt("/", state)
    expect(screen.getByText("134 °C")).toBeTruthy()
    expect(screen.getByText("50 %")).toBeTruthy()
    fireEvent.click(screen.getByRole("link", { name: "Deaerator, opens Deaerator" }))
    expect(where()).toBe("/deaerator")
  })

  it("shows the safe-to-close lamp only while the start-up vent is open", () => {
    const state: PowerPlantState = makeInitialState()
    renderAt("/", state)
    expect(screen.queryByRole("img", { name: /Deaerator safe to close/ })).toBeNull()
    cleanup()
    state.Deaerator.startUpVentOpen = true
    renderAt("/", state)
    expect(screen.getByRole("img", { name: "Deaerator safe to close: off" })).toBeTruthy()
    cleanup()
    state.Deaerator.safeToClose = true
    renderAt("/", state)
    expect(screen.getByRole("img", { name: "Deaerator safe to close: on" })).toBeTruthy()
  })

  it("shows the extraction heater and the air preheater without a link", () => {
    renderAt("/")
    expect(screen.getByText("Extraction heater")).toBeTruthy()
    expect(screen.queryByRole("link", { name: /Extraction heater/ })).toBeNull()
    expect(screen.queryByRole("link", { name: /Air preheater/ })).toBeNull()
  })

  it.each([
    ["Boiler", "burnerTripped"],
    ["Boiler", "heatingRateOverLimit"],
    ["Condenser", "condensationPumpTripped"],
  ])("lights the %s LED from %s", (part: string, flag: string) => {
    const state: PowerPlantState = makeInitialState()
    const owner = part === "Boiler" ? state.Boiler : state.Condenser
    ;(owner as Record<string, unknown>)[flag] = true
    renderAt("/", state)
    expect(screen.getByRole("img", { name: part + " alarm: on" })).toBeTruthy()
    expect(screen.getByRole("img", { name: "Turbine alarm: off" })).toBeTruthy()
  })

  it.each([
    ["Boiler", "/boiler"],
    ["Burner", "/boiler"],
    ["Drain", "/boiler"],
    ["Main steam valve", "/turbine"],
    ["Turbine valve", "/turbine"],
    ["Bypass valve", "/turbine"],
    ["Condenser", "/condenser"],
    ["Condensation pump", "/condenser"],
    ["Recirculation pump", "/condenser"],
    ["Air extraction pump", "/condenser"],
    ["SJAE", "/condenser"],
    ["Hotwell", "/condenser"],
  ])("the %s node opens %s", (label: string, path: string) => {
    renderAt("/")
    fireEvent.click(screen.getByRole("link", { name: new RegExp("^" + label + ", opens ") }))
    expect(where()).toBe(path)
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
    expect(partAlarms(state)).toEqual({ boiler: true, deaerator: false, condenser: true, turbine: false })
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

describe("routes", () => {
  const renderApp = (path: string): void => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <PowerPlantProvider>
          <AppRoutes />
          <Where />
        </PowerPlantProvider>
      </MemoryRouter>,
    )
  }

  it("opens a detail page from a deep link under the header", () => {
    renderApp("/condenser")
    expect(screen.getByRole("heading", { level: 1, name: "Powerplant Simulation" })).toBeTruthy()
    expect(where()).toBe("/condenser")
  })

  it("shows the overview at the root, with the four header slots", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <PowerPlantProvider>
          <AppRoutes />
        </PowerPlantProvider>
      </MemoryRouter>,
    )
    expect(screen.getByRole("heading", { level: 2, name: "Plant" })).toBeTruthy()
    expect(container.querySelectorAll(".board-header-slot")).toHaveLength(4)
  })

  it("sends an unknown path to the overview", () => {
    renderApp("/nonsense")
    expect(where()).toBe("/")
  })
})
