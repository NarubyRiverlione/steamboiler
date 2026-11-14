import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, useLocation } from "react-router-dom"
import { describe, expect, it } from "vitest"
import type { ContextType, ReactNode } from "react"
import { PowerPlantContext } from "../context/PowerPlantContext"
import { makeInitialState } from "../context/PowerPlantReducer"
import type PowerPlantState from "../context/PowerPlantState"
import { CstSuperheater } from "../context/const"
import Layout from "./Layout"
import { Route, Routes } from "react-router-dom"
import PlantOverview from "./PlantOverview"
import AppRoutes from "./AppRoutes"
import PowerPlantProvider from "../context/PowerPlantProvider"
import { PARTS, neighbourPath, partAlarms } from "./plantParts"
import { LABELS, NODES, type DiagramNode } from "./plantDiagram"

function nodeById(id: string): DiagramNode {
  const found: DiagramNode | undefined = NODES.find((node: DiagramNode) => node.id === id)
  if (found === undefined) throw new Error("no node " + id)
  return found
}

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
            <Route path="steam" element={<p>steam page</p>} />
            <Route path="deaerator" element={<p>deaerator page</p>} />
            <Route path="condenser" element={<p>condenser page</p>} />
            <Route path="turbine" element={<p>turbine page</p>} />
            <Route path="generation" element={<p>generation page</p>} />
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
  it("cycles Boiler, Steam, Deaerator, Condenser, Turbine, Generation with Page Down and Right, and back with Page Up and Left", () => {
    renderAt("/")
    fireEvent.keyDown(window, { key: "PageDown" })
    expect(where()).toBe("/boiler")
    fireEvent.keyDown(window, { key: "ArrowRight" })
    expect(where()).toBe("/steam")
    fireEvent.keyDown(window, { key: "PageDown" })
    expect(where()).toBe("/deaerator")
    fireEvent.keyDown(window, { key: "PageDown" })
    expect(where()).toBe("/condenser")
    fireEvent.keyDown(window, { key: "PageDown" })
    expect(where()).toBe("/turbine")
    fireEvent.keyDown(window, { key: "PageDown" })
    expect(where()).toBe("/generation")
    fireEvent.keyDown(window, { key: "PageDown" })
    expect(where()).toBe("/boiler")
    fireEvent.keyDown(window, { key: "PageUp" })
    expect(where()).toBe("/generation")
    fireEvent.keyDown(window, { key: "ArrowLeft" })
    expect(where()).toBe("/turbine")
    fireEvent.keyDown(window, { key: "ArrowLeft" })
    expect(where()).toBe("/condenser")
    fireEvent.keyDown(window, { key: "PageUp" })
    expect(where()).toBe("/deaerator")
    fireEvent.keyDown(window, { key: "PageUp" })
    expect(where()).toBe("/steam")
    fireEvent.keyDown(window, { key: "PageUp" })
    expect(where()).toBe("/boiler")
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
    expect(where()).toBe("/steam")
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

  it("shows Generation in the breadcrumb", () => {
    renderAt("/generation")
    expect(screen.getByRole("navigation", { name: "Breadcrumb" }).textContent).toContain("Generation")
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

  it("draws the boiler feed pump after the deaerator, linking to the deaerator page", () => {
    renderAt("/")
    const deaerator: DiagramNode = nodeById("deaerator")
    const pump: DiagramNode = nodeById("feedpump")
    const heater: DiagramNode = nodeById("heater")
    expect(pump.x).toBeLessThan(deaerator.x)
    expect(heater.x).toBeLessThan(pump.x)
    expect(pump.y + pump.h / 2).toBe(deaerator.y + deaerator.h / 2)
    expect(nodeById("condpump").y + nodeById("condpump").h / 2).toBe(deaerator.y + deaerator.h / 2)
    fireEvent.click(screen.getByRole("link", { name: "Boiler feed pump, opens Deaerator" }))
    expect(where()).toBe("/deaerator")
  })

  it("draws the let-down valve, and no non-return valve and no pass-through", () => {
    renderAt("/")
    expect(screen.getByText("Let-down")).toBeTruthy()
    expect(screen.queryByText("Non-return")).toBeNull()
    expect(NODES.some((node: DiagramNode) => /pass-through/i.test(node.name.join(" ")))).toBe(false)
  })

  it.each([
    ["msv", "valve"],
    ["turbinevalve", "valve"],
    ["bypass", "valve"],
    ["letdown", "valve"],
    ["condpump", "pump"],
    ["feedpump", "pump"],
    ["recirc", "pump"],
    ["car", "pump"],
  ])("draws %s as the %s symbol, still a link when it has a page", (id: string, symbol: string) => {
    expect(nodeById(id).symbol).toBe(symbol)
    renderAt("/")
    const node: DiagramNode = nodeById(id)
    const link: HTMLElement | null = node.part === undefined ? null : screen.getByRole("link", { name: node.name.join(" ") + ", opens " + PARTS[node.part].name })
    if (link !== null) {
      expect(link.querySelector("circle, path.board-node-hit, rect.board-node-hit")).not.toBeNull()
      expect(link.querySelector("rect.board-node-box")).toBeNull()
    }
  })

  it("keeps boxes for the nodes without a symbol", () => {
    renderAt("/")
    const link: HTMLElement = screen.getByRole("link", { name: "Deaerator, opens Deaerator" })
    expect(link.querySelector("rect.board-node-box")).not.toBeNull()
  })

  it("labels the auxiliary steam, the extraction steam and the heater drain cascade", () => {
    const texts: string[] = LABELS.map((label: { text: string }) => label.text)
    expect(texts).toContain("auxiliary steam")
    expect(texts).toContain("extraction steam")
    expect(texts).toContain("heater drain")
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
    ["Generator", "/generation"],
    ["Condenser", "/condenser"],
    ["Condensation pump", "/condenser"],
    ["Recirculation pump", "/condenser"],
    ["extraction", "/condenser"],
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
    expect(partAlarms(state)).toEqual({ boiler: true, steam: false, deaerator: false, condenser: true, turbine: false, generation: false })
    state.Boiler.burnerTripped = false
    state.Boiler.heatingRateOverLimit = true
    expect(partAlarms(state).boiler).toBe(true)
  })

  it("raises the steam part from the high steam temperature, not the boiler", () => {
    const state: PowerPlantState = makeInitialState()
    state.Boiler.steamTemperature = CstSuperheater.AlarmTemperature
    expect(partAlarms(state)).toEqual({ boiler: false, steam: true, deaerator: false, condenser: false, turbine: false, generation: false })
  })

  it("raises the deaerator from its feed pump trip (#137)", () => {
    const state: PowerPlantState = makeInitialState()
    state.Deaerator.feedPumpTripped = true
    expect(partAlarms(state)).toEqual({ boiler: false, steam: false, deaerator: true, condenser: false, turbine: false, generation: false })
  })
})

describe("neighbourPath", () => {
  it("steps into the ends from an unknown path", () => {
    expect(neighbourPath("/", 1)).toBe("/boiler")
    expect(neighbourPath("/", -1)).toBe("/generation")
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
