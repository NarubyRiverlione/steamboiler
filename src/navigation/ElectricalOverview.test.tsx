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
    toggleVitalFeedBreaker: vi.fn(),
    toggleSafetyFeedBreaker: vi.fn(),
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
    expect(screen.getByLabelText("Battery breaker: open")).toBeTruthy()
  })

  it("lights a source line only while its breaker is closed", () => {
    const state: PowerPlantState = livePlant()
    state.Turbine.generatorBreaker = false
    renderBoard(state)
    const sourceLine = (id: string): Element | null => source(id)?.querySelector(".board-pipe") ?? null
    expect(dimmed(sourceLine("grid"))).toBe(false)
    expect(dimmed(sourceLine("generator-tie"))).toBe(true)
    expect(dimmed(sourceLine("generator"))).toBe(true)
    expect(dimmed(sourceLine("diesel"))).toBe(true)
    // The line above an open breaker is still energised from the grid
    const upper = (id: string): Element | null => source(id)?.querySelectorAll(".board-pipe")[1] ?? null
    expect(dimmed(upper("generator-tie"))).toBe(false)
    state.gridSupplyBreaker = false
    cleanup()
    renderBoard(state)
    expect(dimmed(sourceLine("grid"))).toBe(true)
    expect(dimmed(upper("grid"))).toBe(false)
  })

  it("draws the generator column: the generator breaker to the grid, the unit aux breaker to the Auxiliary bus (#189)", () => {
    const state: PowerPlantState = livePlant()
    state.gridSupplyBreaker = false
    state.Turbine.unitAuxBreaker = true
    renderBoard(state)
    expect(screen.getByLabelText("Unit aux breaker: closed")).toBeTruthy()
    expect(screen.getByLabelText("Grid supply breaker: open")).toBeTruthy()
    const sourceLine = (id: string): Element | null => source(id)?.querySelector(".board-pipe") ?? null
    expect(dimmed(sourceLine("generator"))).toBe(false)
    expect(dimmed(sourceLine("generator-tie"))).toBe(false)
    expect(dimmed(sourceLine("grid"))).toBe(true)
  })

  it("never dims a clickable box or breaker; the grid box, without a link, stays lit: the grid is always up", () => {
    const state: PowerPlantState = livePlant()
    state.gridSupplyBreaker = false
    state.Turbine.generatorBreaker = false
    state.upsCharge = 0
    renderBare(state)
    const boxes: Element[] = Array.from(document.querySelectorAll(".board-node .board-node-box, .board-node .board-breaker-symbol"))
    expect(boxes.length).toBe(16)
    expect(boxes.filter(dimmed)).toEqual([])
    expect(
      dimmed(document.querySelector("[data-grid] .board-node-box:not(.board-node .board-node-box)")),
    ).toBe(false)
  })

  it("shows the live values: voltages, consumer draws, total, diesel output and UPS charge", () => {
    renderBoard(livePlant())
    expect(text("Grid voltage")).toBe("110 kV")
    expect(text("Load setpoint")).toBe("0.00 MW")
    expect(text("Generator output")).toBe("0.00 MW")
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
    expect(dimmed(document.querySelector("[data-consumers] > .board-pipe"))).toBe(true)
    expect(dimmed(bus("vital"))).toBe(true)
    expect(dimmed(bus("safety"))).toBe(false)
    expect(text("Auxiliary bus voltage")).toBe("0.0 kV")
    expect(text("Vital bus voltage")).toBe("0 V")
    expect(text("Boiler feed pump draw")).toBe("0.00 MW")
    expect(screen.getByLabelText("Boiler feed pump: off")).toBeTruthy()
  })

  it("shows Instrumentation on the vital bus and Emergency equipment on the safety bus, lit with their bus", () => {
    renderBoard(livePlant())
    expect(screen.getByLabelText("Instrumentation: on")).toBeTruthy()
    expect(screen.getByLabelText("Emergency equipment: on")).toBeTruthy()
    cleanup()
    const dead: PowerPlantState = livePlant()
    dead.gridSupplyBreaker = false
    dead.Turbine.generatorBreaker = false
    renderBare(dead)
    expect(screen.getByLabelText("Instrumentation: off")).toBeTruthy()
    expect(dimmed(document.querySelector('[data-bus-load="vital"]'))).toBe(true)
    expect(screen.getByLabelText("Emergency equipment: on")).toBeTruthy()
  })

  it("draws the chain: Aux→Vital and Vital→Safety closed, the battery breaker open, the feeds lit (#196)", () => {
    renderBoard(livePlant())
    expect(screen.getByLabelText("Aux to Vital breaker: closed")).toBeTruthy()
    expect(screen.getByLabelText("Vital to Safety breaker: closed")).toBeTruthy()
    expect(screen.getByLabelText("Battery breaker: open")).toBeTruthy()
    expect(dimmed(document.querySelector('[data-feed="vital"]'))).toBe(false)
    expect(dimmed(document.querySelector('[data-feed="safety-ac"]'))).toBe(false)
    expect(dimmed(document.querySelector('[data-feed="safety"]'))).toBe(true)
  })

  it("on a lost grid the chain is open, the battery feeds the safety bus and its feed is lit (#196)", () => {
    const state: PowerPlantState = livePlant()
    state.gridSupplyBreaker = false
    state.Turbine.generatorBreaker = false
    state.vitalFeedBreaker = false
    state.safetyFeedBreaker = false
    renderBare(state)
    expect(screen.getByLabelText("Aux to Vital breaker: open")).toBeTruthy()
    expect(screen.getByLabelText("Vital to Safety breaker: open")).toBeTruthy()
    expect(screen.getByLabelText("Battery breaker: closed")).toBeTruthy()
    expect(dimmed(document.querySelector('[data-feed="vital"]'))).toBe(true)
    expect(dimmed(document.querySelector('[data-feed="safety-ac"]'))).toBe(true)
    expect(dimmed(document.querySelector('[data-feed="safety"]'))).toBe(false)
    expect(dimmed(bus("vital"))).toBe(true)
    expect(dimmed(bus("safety"))).toBe(false)
  })

  it("dims the safety bus with a flat battery and Vital→Safety open", () => {
    const empty: PowerPlantState = livePlant()
    empty.safetyFeedBreaker = false
    empty.upsCharge = 0
    renderBare(empty)
    expect(dimmed(bus("safety"))).toBe(true)
    expect(text("Safety bus voltage")).toBe("0 V DC")
  })

  it("marks the EMY and Battery breakers automatic with an A; they and the other interlocked breakers get a dashed frame, no other breaker", () => {
    renderBoard(livePlant())
    const breakers: Element[] = Array.from(document.querySelectorAll("[data-closed]"))
    const automatic: (string | null)[] = breakers
      .filter((b) => b.getAttribute("data-automatic") === "true")
      .map((b) => b.getAttribute("aria-label"))
    expect(automatic.map((n) => n?.split(":")[0]).sort()).toEqual(["Battery breaker", "EMY breaker"])
    for (const b of breakers) {
      const auto: boolean = b.getAttribute("data-automatic") === "true"
      const partner: boolean = /^(Aux to Vital|Vital to Safety|Grid supply|Unit aux) breaker:/.test(b.getAttribute("aria-label") ?? "")
      expect(b.querySelector(".board-breaker-frame") !== null).toBe(auto || partner)
      expect(b.querySelector(".board-breaker-auto")?.textContent ?? null).toBe(auto ? "A" : null)
    }
  })

  it("joins each pair of interlocked breakers by a dashed line, from frame edge to frame edge", () => {
    renderBoard(livePlant())
    const centre = (name: string): [number, number] => {
      const transform: string = screen.getByLabelText(new RegExp("^" + name + ": ")).getAttribute("transform") ?? ""
      const match: RegExpMatchArray | null = /translate\(([\d.]+) ([\d.]+)\)/.exec(transform)
      return [Number(match?.[1]), Number(match?.[2])]
    }
    // On the edge of the drawn breaker footprint (half size 15 × 150%)
    const onEdge = ([px, py]: number[], name: string): boolean => {
      const [cx, cy] = centre(name)
      return Math.max(Math.abs(px - cx), Math.abs(py - cy)) === 22.5
    }
    const lines: Element[] = Array.from(document.querySelectorAll("[data-interlock]"))
    expect(lines.map((l) => l.getAttribute("data-breakers"))).toEqual([
      "EMY breaker|Aux to Vital breaker",
      "Battery breaker|Vital to Safety breaker",
      "Grid supply breaker|Unit aux breaker",
    ])
    for (const l of lines) {
      const [from, to] = (l.getAttribute("data-breakers") ?? "").split("|")
      const points: number[][] = (l.getAttribute("d") ?? "")
        .replace("M ", "")
        .split(" L ")
        .map((p) => p.split(" ").map(Number))
      expect(onEdge(points[0], from)).toBe(true)
      expect(onEdge(points[points.length - 1], to)).toBe(true)
    }
  })

  it("links the breakers and the diesel to the pages that hold them", () => {
    renderBoard(livePlant())
    const hrefOf = (name: string): string | null => screen.getByRole("link", { name }).getAttribute("href")
    expect(hrefOf("Grid supply breaker, opens Auxiliary bus")).toBe("/auxiliary-bus")
    expect(hrefOf("Aux to Vital breaker, opens Emergency power")).toBe("/emergency-power")
    expect(hrefOf("Vital to Safety breaker, opens Emergency power")).toBe("/emergency-power")
    expect(hrefOf("UPS, opens Emergency power")).toBe("/emergency-power")
    expect(screen.queryByRole("link", { name: /^Battery breaker/ })).toBeNull()
    expect(hrefOf("Generator, opens Generation")).toBe("/generation")
    expect(hrefOf("Generator breaker, opens Generation")).toBe("/generation")
    expect(hrefOf("Unit aux breaker, opens Auxiliary bus")).toBe("/auxiliary-bus")
    expect(hrefOf("Diesel generator, opens Diesel generator")).toBe("/diesel")
    expect(hrefOf("Diesel generator breaker, opens Diesel generator")).toBe("/diesel")
    expect(hrefOf("Boiler feed pump, opens Deaerator")).toBe("/deaerator")
    expect(hrefOf("Recirculation pump, opens Condenser")).toBe("/condenser")
    expect(hrefOf("Condensation pump, opens Condenser")).toBe("/condenser")
    expect(hrefOf("Air extraction pump, opens Condenser")).toBe("/condenser")
    expect(hrefOf("Lube oil pump, opens Turbine aux")).toBe("/turbine-aux")
    expect(hrefOf("Turning gear motor, opens Turbine aux")).toBe("/turbine-aux")
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
    expect(colourOf(source("generator-tie"))).toBe("board-electrical-generator")
    expect(colourOf(source("diesel"))).toBe("board-electrical-diesel")
    expect(colourOf(document.querySelector("[data-ups]"))).toBe("board-electrical-ups")
    expect(colourOf(document.querySelector('[data-feed="safety"]'))).toBe("board-electrical-ups")
    expect(colourOf(bus("aux"))).toBe("board-electrical-aux")
    expect(colourOf(document.querySelector("[data-consumers]"))).toBe("board-electrical-aux")
    expect(colourOf(bus("vital"))).toBe("board-electrical-vital")
    expect(colourOf(document.querySelector('[data-feed="vital"]'))).toBe("board-electrical-aux")
    expect(colourOf(document.querySelector('[data-feed="safety-ac"]'))).toBe("board-electrical-vital")
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
    state.vitalFeedBreaker = false
    state.safetyFeedBreaker = false
    renderBoard(state)
    expect(text("Auxiliary bus voltage")).toBe("")
    expect(text("Boiler feed pump draw")).toBe("")
    expect(screen.getByLabelText("Battery breaker: closed")).toBeTruthy()
    expect(bus("aux")).not.toBeNull()
  })
})
