/** The Electrical overview (#171): breakers, lit and dimmed buses, consumer LEDs, value labels, links and the Values toggle. */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { ContextType } from "react"
import { PowerPlantContext } from "../context/PowerPlantContext"
import { makeInitialState } from "../context/PowerPlantReducer"
import type PowerPlantState from "../context/PowerPlantState"
import Layout from "./Layout"
import ElectricalOverview from "./ElectricalOverview"

afterEach(cleanup)

function renderBoard(state: PowerPlantState) {
  const value = {
    state,
    dispatch: vi.fn(),
    toggleUpsBreaker: vi.fn(),
    simulatedSeconds: 60,
    playbackSpeed: 1,
    setPlaybackSpeed: vi.fn(),
  } as unknown as ContextType<typeof PowerPlantContext>
  return render(
    <PowerPlantContext.Provider value={value}>
      <MemoryRouter initialEntries={["/electrical"]}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route path="electrical" element={<ElectricalOverview />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </PowerPlantContext.Provider>,
  )
}

// The page alone, so the board state stays normal and the readouts show what the bus carries
function renderBare(state: PowerPlantState) {
  const value = { state, dispatch: vi.fn() } as unknown as ContextType<typeof PowerPlantContext>
  return render(
    <PowerPlantContext.Provider value={value}>
      <MemoryRouter>
        <ElectricalOverview />
      </MemoryRouter>
    </PowerPlantContext.Provider>,
  )
}

const text = (label: string): string | null => screen.getByLabelText(label).textContent
const source = (id: string): Element | null => document.querySelector('[data-source="' + id + '"]')
const bus = (id: string): Element | null => document.querySelector('[data-bus="' + id + '"]')
const dimmed = (element: Element | null): boolean =>
  element?.classList.contains("board-electrical-dim") ?? false

// A running plant: grid and generator closed, the six consumers drawing
function livePlant(): PowerPlantState {
  const state: PowerPlantState = makeInitialState()
  state.gridSupplyBreaker = true
  state.Turbine.generatorBreaker = true
  state.upsBreaker = true
  state.upsCharge = 87.4
  state.Deaerator.feedPumpValvePosition = 0.5
  state.Condenser.condensationPumpValvePosition = 1
  state.Condenser.recirculationPumpValvePosition = 1
  state.Condenser.isAirExtractionPumpEnabled = true
  return state
}

describe("electrical overview", () => {
  it("draws each breaker closed or open from its state", () => {
    const state: PowerPlantState = livePlant()
    state.dieselBreaker = false
    renderBoard(state)
    expect(screen.getByLabelText("Grid supply breaker: closed")).toBeTruthy()
    expect(screen.getByLabelText("Generator breaker: closed")).toBeTruthy()
    expect(screen.getByLabelText("Diesel generator breaker: open")).toBeTruthy()
    expect(screen.getByLabelText("UPS breaker: closed")).toBeTruthy()
  })

  it("lights a source only while its breaker is closed", () => {
    const state: PowerPlantState = livePlant()
    state.Turbine.generatorBreaker = false
    renderBoard(state)
    expect(dimmed(source("grid"))).toBe(false)
    expect(dimmed(source("generator"))).toBe(true)
    expect(dimmed(source("diesel"))).toBe(true)
  })

  it("shows the live values: voltages, consumer draws, total, diesel output and UPS charge", () => {
    renderBoard(livePlant())
    expect(text("Grid voltage")).toBe("110 kV")
    expect(text("Auxiliary bus voltage")).toBe("6.0 kV")
    expect(text("Vital bus voltage")).toBe("230 V")
    expect(text("Safety bus voltage")).toBe("110 V DC")
    expect(text("Boiler feed pump draw")).toBe("2.25 MW")
    expect(text("Recirculation pump draw")).toBe("1.75 MW")
    expect(text("Lube oil pump draw")).toBe("0.00 MW")
    expect(text("Auxiliary load")).toBe("4.50 MW")
    expect(text("Diesel output")).toBe("0.00 MW")
    expect(text("UPS charge")).toBe("87 %")
  })

  it("lights a consumer LED while it draws", () => {
    renderBoard(livePlant())
    expect(screen.getByLabelText("Boiler feed pump: on")).toBeTruthy()
    expect(screen.getByLabelText("Lube oil pump: off")).toBeTruthy()
    expect(screen.getByLabelText("Turning gear motor: off")).toBeTruthy()
  })

  it("dims a dead Auxiliary bus, its consumers and the vital bus, with 0 voltages", () => {
    const state: PowerPlantState = livePlant()
    state.gridSupplyBreaker = false
    state.Turbine.generatorBreaker = false
    renderBare(state)
    expect(dimmed(bus("aux"))).toBe(true)
    expect(dimmed(document.querySelector("[data-consumers]"))).toBe(true)
    expect(dimmed(bus("vital"))).toBe(true)
    expect(dimmed(bus("safety"))).toBe(false)
    expect(text("Auxiliary bus voltage")).toBe("0.0 kV")
    expect(text("Vital bus voltage")).toBe("0 V")
    expect(text("Boiler feed pump draw")).toBe("0.00 MW")
    expect(screen.getByLabelText("Boiler feed pump: off")).toBeTruthy()
  })

  it("dims the safety bus with the UPS breaker open or the charge at 0", () => {
    const open: PowerPlantState = livePlant()
    open.upsBreaker = false
    renderBoard(open)
    expect(dimmed(bus("safety"))).toBe(true)
    expect(text("Safety bus voltage")).toBe("0 V DC")
    cleanup()
    const empty: PowerPlantState = livePlant()
    empty.upsCharge = 0
    renderBoard(empty)
    expect(dimmed(bus("safety"))).toBe(true)
  })

  it("links the breakers and the diesel to the pages that hold them", () => {
    renderBoard(livePlant())
    const hrefOf = (name: string): string | null => screen.getByRole("link", { name }).getAttribute("href")
    expect(hrefOf("Grid supply breaker, opens Auxiliary bus")).toBe("/auxiliary-bus")
    expect(hrefOf("UPS breaker, opens Auxiliary bus")).toBe("/auxiliary-bus")
    expect(hrefOf("UPS, opens Auxiliary bus")).toBe("/auxiliary-bus")
    expect(hrefOf("Generator breaker, opens Generation")).toBe("/generation")
    expect(hrefOf("Diesel generator, opens Diesel generator")).toBe("/diesel")
    expect(hrefOf("Diesel generator breaker, opens Diesel generator")).toBe("/diesel")
    expect(screen.queryByRole("link", { name: /^Grid, opens/ })).toBeNull()
  })

  it("draws each source, the UPS and each bus in its own colour", () => {
    renderBare(livePlant())
    const colourOf = (element: Element | null): string | undefined =>
      Array.from(element?.classList ?? []).find(
        (name: string) => name.startsWith("board-electrical-") && name !== "board-electrical-dim",
      )
    expect(colourOf(source("grid"))).toBe("board-electrical-grid")
    expect(colourOf(source("generator"))).toBe("board-electrical-generator")
    expect(colourOf(source("diesel"))).toBe("board-electrical-diesel")
    expect(colourOf(document.querySelector("[data-ups]"))).toBe("board-electrical-ups")
    expect(colourOf(document.querySelector('[data-feed="safety"]'))).toBe("board-electrical-ups")
    expect(colourOf(bus("aux"))).toBe("board-electrical-aux")
    expect(colourOf(document.querySelector("[data-consumers]"))).toBe("board-electrical-aux")
    expect(colourOf(bus("vital"))).toBe("board-electrical-vital")
    expect(colourOf(document.querySelector('[data-feed="vital"]'))).toBe("board-electrical-vital")
    expect(colourOf(bus("safety"))).toBe("board-electrical-safety")
  })

  it("hides every value label with the Values toggle", () => {
    renderBoard(livePlant())
    fireEvent.click(screen.getByRole("button", { name: "Values" }))
    expect(screen.queryByLabelText("Auxiliary bus voltage")).toBeNull()
    expect(screen.queryByLabelText("Boiler feed pump draw")).toBeNull()
    expect(screen.queryByLabelText("UPS charge")).toBeNull()
    expect(screen.getByLabelText("Boiler feed pump: on")).toBeTruthy()
  })

  it("on the emergency board the value labels are blank and the mimic still renders", () => {
    const state: PowerPlantState = livePlant()
    state.gridSupplyBreaker = false
    state.Turbine.generatorBreaker = false
    renderBoard(state)
    expect(text("Auxiliary bus voltage")).toBe("")
    expect(text("Boiler feed pump draw")).toBe("")
    expect(screen.getByLabelText("UPS breaker: closed")).toBeTruthy()
    expect(bus("aux")).not.toBeNull()
  })
})
