import { cleanup, type BoundFunctions, type queries, fireEvent, render, screen, within } from "@testing-library/react"
import type { ContextType } from "react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PowerPlantContext } from "../context/PowerPlantContext"
import { makeInitialState } from "../context/PowerPlantReducer"
import type PowerPlantState from "../context/PowerPlantState"
import AuxiliaryBus from "../components/AuxiliaryBus/AuxiliaryBus"
import { RoundGauge } from "../components/board/RoundGauge"
import { Display } from "../components/board/Display"
import Layout from "./Layout"
import PlantOverview from "./PlantOverview"

afterEach(cleanup)

const stateOf = (vital: boolean, safety: boolean, ended = false): PowerPlantState => ({
  ...makeInitialState(),
  gridSupplyBreaker: vital,
  upsBreaker: safety,
  upsCharge: 50,
  simulationEnded: ended,
})

function renderBoard(state: PowerPlantState, path = "/", toggleUpsBreaker: () => void = vi.fn()) {
  const value = { state, dispatch: vi.fn(), toggleUpsBreaker, simulatedSeconds: 60, playbackSpeed: 1, setPlaybackSpeed: vi.fn() } as unknown as ContextType<typeof PowerPlantContext>
  return render(
    <PowerPlantContext.Provider value={value}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<PlantOverview />} />
            <Route path="boiler" element={<><Display label="Boiler lcd" text="9.9" /><RoundGauge label="Gauge" unit="bar" value={5} min={0} max={10} major={5} minor={1} /></>} />
            <Route path="auxiliary-bus" element={<AuxiliaryBus />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </PowerPlantContext.Provider>,
  )
}

const shell = (): Element => {
  const found: Element | null = document.querySelector(".board-shell")
  if (found === null) throw new Error("no board shell")
  return found
}
const head = (): BoundFunctions<typeof queries> => within(screen.getByRole("banner"))
const annunciator = (): HTMLElement | null => screen.queryByRole("button", { name: "ACK" })

describe("normal board", () => {
  it("is the board as today: header, navigation, annunciator, no UPS strip, no emergency lens", () => {
    renderBoard(stateOf(true, true))
    expect(screen.getByRole("link", { name: "Plant overview" })).toBeTruthy()
    expect(annunciator()).not.toBeNull()
    expect(head().getByLabelText("Boiler pressure").textContent).not.toBe("")
    expect(screen.queryByLabelText("UPS charge")).toBeNull()
    expect(shell().classList.contains("board-emergency")).toBe(false)
  })
})

describe("emergency board", () => {
  it("shows the red lens, keeps the navigation, blanks the LCDs but not the clock, hides the annunciator", () => {
    renderBoard(stateOf(false, true))
    expect(shell().classList.contains("board-emergency")).toBe(true)
    expect(screen.getByRole("link", { name: "Plant overview" })).toBeTruthy()
    expect(head().getByLabelText("Boiler pressure").textContent).toBe("")
    expect(head().getByLabelText("Output").textContent).toBe("")
    expect(screen.getByLabelText("Simulated clock").textContent).not.toBe("")
    expect(annunciator()).toBeNull()
  })

  it("mounts the UPS group on the overview and on a part page, and the gauges still render", () => {
    renderBoard(stateOf(false, true), "/boiler")
    expect(screen.getByLabelText("UPS charge")).toBeTruthy()
    expect(screen.getByLabelText("Boiler lcd").textContent).toBe("")
    expect(screen.getByLabelText("Gauge")).toBeTruthy()
    cleanup()
    renderBoard(stateOf(false, true), "/")
    expect(screen.getByLabelText("UPS charge")).toBeTruthy()
  })

  it("puts the UPS group in a column beside the page, not above it, so the page keeps its height", () => {
    renderBoard(stateOf(false, true), "/")
    const group: HTMLElement = screen.getByLabelText("UPS charge")
    const strip: Element | null = group.closest(".board-ups-strip")
    const main: Element | null = document.querySelector("main.board-main")
    expect(strip?.parentElement).toBe(main?.parentElement)
    expect(main?.parentElement?.classList.contains("board-body")).toBe(true)
  })

  it("shows one UPS group on the Auxiliary bus page", () => {
    renderBoard(stateOf(false, true), "/auxiliary-bus")
    expect(screen.getAllByLabelText("UPS charge")).toHaveLength(1)
  })
})

describe("dark board", () => {
  it("shows only the UPS breaker switch, the clock and the time controls", () => {
    const toggle = vi.fn()
    renderBoard(stateOf(false, false), "/", toggle)
    expect(screen.getByLabelText("Simulated clock")).toBeTruthy()
    expect(screen.getByRole("group", { name: "Playback speed" })).toBeTruthy()
    expect(screen.queryByRole("link", { name: "Plant overview" })).toBeNull()
    expect(screen.queryByLabelText("UPS charge")).toBeNull()
    expect(screen.queryByLabelText("Boiler pressure")).toBeNull()
    expect(annunciator()).toBeNull()
    expect(screen.queryByRole("button", { name: "Presets" })).toBeNull()
    expect(shell().classList.contains("board-dark")).toBe(true)
    fireEvent.click(screen.getByRole("switch", { name: "Battery breaker, cover down" }))
    fireEvent.click(screen.getByRole("switch", { name: "Battery breaker, cover up" }))
    expect(toggle).toHaveBeenCalledOnce()
  })
})

describe("ended board", () => {
  it("shows the end plate and the Presets button and nothing else, whatever the buses say", () => {
    renderBoard(stateOf(true, true, true))
    expect(screen.getByText(/UPS discharged/i)).toBeTruthy()
    expect(screen.getByRole("button", { name: "Presets" })).toBeTruthy()
    expect(screen.queryByRole("link", { name: "Plant overview" })).toBeNull()
    expect(screen.queryByLabelText("Boiler pressure")).toBeNull()
    expect(screen.queryByLabelText("Simulated clock")).toBeNull()
    expect(screen.queryByRole("group", { name: "Playback speed" })).toBeNull()
    expect(shell().classList.contains("board-ended")).toBe(true)
  })
})
