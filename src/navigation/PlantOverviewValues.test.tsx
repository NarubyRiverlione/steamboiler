/** The live values on the plant overview (#99): the labels beside the nodes and the Values toggle. */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it } from "vitest"
import type { ContextType, ReactElement } from "react"
import { PowerPlantContext } from "../context/PowerPlantContext"
import { makeInitialState } from "../context/PowerPlantReducer"
import type PowerPlantState from "../context/PowerPlantState"
import Boiler from "../components/Boiler/Boiler"
import { ValveRampProvider } from "../components/board/ValveRampProvider"
import Condenser from "../components/Condenser/Condenser"
import PlantOverview from "./PlantOverview"
import { DIAGRAM_VALUES, NODES } from "./plantDiagram"

afterEach(cleanup)

function renderWith(state: PowerPlantState, element: ReactElement = <PlantOverview />) {
  const noop = (): void => undefined
  const value = { state, dispatch: noop } as unknown as ContextType<typeof PowerPlantContext>
  return render(
    <PowerPlantContext.Provider value={value}>
      <ValveRampProvider valves={{}}>
        <MemoryRouter>{element}</MemoryRouter>
      </ValveRampProvider>
    </PowerPlantContext.Provider>,
  )
}

const text = (label: string): string | null => screen.getByLabelText(label).textContent

function livePlant(): PowerPlantState {
  const state: PowerPlantState = makeInitialState()
  state.Boiler.pressure = 123.46
  state.Boiler.waterVolume = 55_000
  state.Boiler.gasFlow = 8123.4
  state.Boiler.returnTemperatureOut = 187.4
  state.Boiler.stackTemperature = 212.6
  state.Boiler.steamTemperature = 538.4
  state.Turbine.mainSteamValve = true
  state.Turbine.turbineValvePosition = 0.42
  state.Turbine.bypassValvePosition = 0.07
  state.Turbine.rpm = 2987.3
  state.Turbine.loadSetpoint = 250
  state.Turbine.electricOutput = 180.26
  state.Condenser.pressure = 87.4
  state.Condenser.hotwellWaterVolume = 35_000
  state.Condenser.condensationPumpValvePosition = 0.6
  state.Deaerator.feedPumpValvePosition = 0.35
  state.Deaerator.temperature = 133.5
  state.Deaerator.waterVolume = 75_000
  state.Heater.returnTemperature = 143.2
  return state
}

describe("plant overview values", () => {
  it("shows the live value beside each node of the brief", () => {
    renderWith(livePlant())
    expect(text("Boiler pressure")).toBe("123.5 bar")
    expect(text("Boiler level")).toBe("55 %")
    expect(text("Gas flow")).toBe("8123 L/s")
    expect(text("Main steam valve")).toBe("OPEN")
    expect(text("Turbine valve position")).toBe("42 %")
    expect(text("Bypass valve position")).toBe("7 %")
    expect(text("Turbine speed")).toBe("2987 rpm")
    expect(text("Output")).toBe("180.3 MW")
    expect(text("Load setpoint")).toBe("250.0 MW")
    expect(text("Condenser pressure")).toBe("87 mbar")
    expect(text("Hotwell level")).toBe("70 %")
    expect(text("Condensation pump position")).toBe("60 %")
    expect(text("Deaerator temperature")).toBe("134 °C")
    expect(text("Deaerator level")).toBe("50 %")
    expect(text("Boiler feed pump position")).toBe("35 %")
    expect(text("Extraction heater temperature")).toBe("143 °C")
    expect(text("Economizer temperature")).toBe("187 °C")
    expect(text("Stack temperature")).toBe("213 °C")
    expect(text("Steam temperature")).toBe("538 °C")
  })

  it("shows a dash for the steam temperature until the steam is superheated", () => {
    renderWith(makeInitialState())
    expect(text("Steam temperature")).toBe("—")
  })

  it("shows the main steam valve closed", () => {
    const state: PowerPlantState = livePlant()
    state.Turbine.mainSteamValve = false
    renderWith(state)
    expect(text("Main steam valve")).toBe("CLOSED")
  })

  it("sits every value on a node of the diagram", () => {
    for (const value of DIAGRAM_VALUES) {
      expect(NODES.some((node) => node.id === value.node)).toBe(true)
    }
  })

  it("hides and shows all values with the Values toggle, on at load", () => {
    renderWith(livePlant())
    const toggle: HTMLElement = screen.getByRole("button", { name: "Values" })
    expect(toggle.getAttribute("aria-pressed")).toBe("true")
    expect(screen.queryByLabelText("Boiler pressure")).not.toBeNull()
    fireEvent.click(toggle)
    expect(toggle.getAttribute("aria-pressed")).toBe("false")
    for (const value of DIAGRAM_VALUES) expect(screen.queryByLabelText(value.label)).toBeNull()
    fireEvent.click(toggle)
    expect(screen.queryByLabelText("Boiler pressure")).not.toBeNull()
  })

  it("shows the drum and hotwell levels as the part pages do", () => {
    const state: PowerPlantState = livePlant()
    renderWith(state)
    const drum: string | null = text("Boiler level")
    const hotwell: string | null = text("Hotwell level")
    cleanup()
    renderWith(state, <Boiler />)
    expect(Number(text("Drum level")) * 100).toBeCloseTo(Number.parseFloat(drum ?? ""), 5)
    cleanup()
    renderWith(state, <Condenser />)
    expect(Number(text("Hotwell level")) * 100).toBeCloseTo(Number.parseFloat(hotwell ?? ""), 5)
  })
})
