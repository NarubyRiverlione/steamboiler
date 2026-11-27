import { cleanup, type BoundFunctions, type queries, render, screen, within } from "@testing-library/react"
import type { ContextType } from "react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PowerPlantContext } from "../context/PowerPlantContext"
import { makeInitialState } from "../context/PowerPlantReducer"
import type PowerPlantState from "../context/PowerPlantState"
import AuxiliaryBus from "../components/AuxiliaryBus/AuxiliaryBus"
import EmergencyPower from "../components/EmergencyPower/EmergencyPower"
import { RoundGauge } from "../components/board/RoundGauge"
import { Display } from "../components/board/Display"
import Layout from "./Layout"
import PlantOverview from "./PlantOverview"

afterEach(cleanup)

const stateOf = (vital: boolean, ended = false): PowerPlantState => ({
  ...makeInitialState(),
  gridSupplyBreaker: vital,
  vitalFeedBreaker: vital,
  safetyFeedBreaker: vital,
  upsCharge: 50,
  simulationEnded: ended,
})

function renderBoard(state: PowerPlantState, path = "/") {
  const value = { state, dispatch: vi.fn(), toggleVitalFeedBreaker: vi.fn(), toggleSafetyFeedBreaker: vi.fn(), simulatedSeconds: 60, playbackSpeed: 1, setPlaybackSpeed: vi.fn() } as unknown as ContextType<typeof PowerPlantContext>
  return render(
    <PowerPlantContext.Provider value={value}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<PlantOverview />} />
            <Route path="boiler" element={<><Display label="Boiler lcd" text="9.9" /><RoundGauge label="Gauge" unit="bar" value={5} min={0} max={10} major={5} minor={1} /></>} />
            <Route path="auxiliary-bus" element={<AuxiliaryBus />} />
            <Route path="emergency-power" element={<EmergencyPower />} />
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
  it("is the board as today: header, navigation, annunciator, no emergency lens", () => {
    renderBoard(stateOf(true))
    expect(screen.getByRole("link", { name: "Plant overview" })).toBeTruthy()
    expect(annunciator()).not.toBeNull()
    expect(head().getByLabelText("Boiler pressure").textContent).not.toBe("")
    expect(screen.queryByLabelText("UPS charge")).toBeNull()
    expect(shell().classList.contains("board-emergency")).toBe(false)
  })
})

describe("emergency board", () => {
  it("shows the red lens, keeps the navigation, blanks the LCDs but not the clock, hides the annunciator", () => {
    renderBoard(stateOf(false))
    expect(shell().classList.contains("board-emergency")).toBe(true)
    expect(screen.getByRole("link", { name: "Plant overview" })).toBeTruthy()
    expect(head().getByLabelText("Boiler pressure").textContent).toBe("")
    expect(head().getByLabelText("Output").textContent).toBe("")
    expect(screen.getByLabelText("Simulated clock").textContent).not.toBe("")
    expect(annunciator()).toBeNull()
  })

  it("has no UPS strip on the overview or on a part page, and the gauges still render", () => {
    renderBoard(stateOf(false), "/boiler")
    expect(screen.queryByLabelText("UPS charge")).toBeNull()
    expect(document.querySelector(".board-ups-strip")).toBeNull()
    expect(document.querySelector(".board-body")).toBeNull()
    expect(screen.getByLabelText("Boiler lcd").textContent).toBe("")
    expect(screen.getByLabelText("Gauge")).toBeTruthy()
    cleanup()
    renderBoard(stateOf(false), "/")
    expect(screen.queryByLabelText("UPS charge")).toBeNull()
  })

  it("has no UPS group on the Auxiliary bus page", () => {
    renderBoard(stateOf(false), "/auxiliary-bus")
    expect(screen.queryByLabelText("UPS charge")).toBeNull()
  })

  it("shows the UPS charge on the Emergency power page", () => {
    renderBoard(stateOf(false), "/emergency-power")
    expect(screen.getAllByLabelText("UPS charge")).toHaveLength(1)
  })

  it("is never dark: a dead Vital bus with a flat battery and the simulation not yet ended is still emergency", () => {
    renderBoard({ ...stateOf(false), upsCharge: 0 })
    expect(shell().classList.contains("board-emergency")).toBe(true)
  })
})

describe("ended board", () => {
  it("shows the end plate and the Presets button and nothing else, whatever the buses say", () => {
    renderBoard(stateOf(true, true))
    expect(screen.getByText(/UPS discharged/i)).toBeTruthy()
    expect(screen.getByRole("button", { name: "Presets" })).toBeTruthy()
    expect(screen.queryByRole("link", { name: "Plant overview" })).toBeNull()
    expect(screen.queryByLabelText("Boiler pressure")).toBeNull()
    expect(screen.queryByLabelText("Simulated clock")).toBeNull()
    expect(screen.queryByRole("group", { name: "Playback speed" })).toBeNull()
    expect(shell().classList.contains("board-ended")).toBe(true)
  })
})
