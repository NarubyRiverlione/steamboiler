import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { ContextType } from "react"
import { PowerPlantContext } from "../../context/PowerPlantContext"
import { makeInitialState } from "../../context/PowerPlantReducer"
import type PowerPlantState from "../../context/PowerPlantState"
import Condenser from "./Condenser"

type Ctx = ContextType<typeof PowerPlantContext>

function renderCondenser(patch: Partial<PowerPlantState["Condenser"]> = {}) {
  const state: PowerPlantState = makeInitialState()
  state.Condenser = { ...state.Condenser, ...patch }
  const fns = {
    toggleAirExtractionPump: vi.fn(),
    toggleSjae: vi.fn(),
    adjustSjaeValvePosition: vi.fn(),
    adjustRecirculationPumpValvePosition: vi.fn(),
    adjustCondensationPumpValvePosition: vi.fn(),
    adjustMakeupValvePosition: vi.fn(),
    adjustRejectValvePosition: vi.fn(),
  }
  const value = { state, dispatch: vi.fn(), ...fns } as unknown as Ctx
  render(
    <PowerPlantContext.Provider value={value}>
      <Condenser />
    </PowerPlantContext.Provider>,
  )
  return fns
}

function clickValve(label: string, direction: "Open" | "Close"): void {
  const valve: HTMLElement =
    screen.getByRole("meter", { name: `${label} knob` }).closest(".board-valve") ?? document.body
  fireEvent.click(within(valve).getByRole("button", { name: direction }))
}

describe("Condenser page", () => {
  it("toggles the air extraction pump and the SJAE, showing their state", () => {
    const fns = renderCondenser({ isAirExtractionPumpEnabled: true, isSjaeEnabled: false })
    const car: HTMLElement = screen.getByRole("button", { name: "STOP" })
    expect(car.getAttribute("aria-pressed")).toBe("true")
    fireEvent.click(car)
    const sjae: HTMLElement = screen.getByRole("button", { name: "ENABLE" })
    expect(sjae.getAttribute("aria-pressed")).toBe("false")
    fireEvent.click(sjae)
    expect(fns.toggleAirExtractionPump).toHaveBeenCalledTimes(1)
    expect(fns.toggleSjae).toHaveBeenCalledTimes(1)
  })

  it("steps each of the five valves with its own step", () => {
    const fns = renderCondenser()
    clickValve("SJAE valve", "Open")
    clickValve("Recirculation pump", "Close")
    clickValve("Condensation pump", "Open")
    clickValve("Makeup", "Open")
    clickValve("Reject", "Close")
    expect(fns.adjustSjaeValvePosition).toHaveBeenCalledWith(0.05)
    expect(fns.adjustRecirculationPumpValvePosition).toHaveBeenCalledWith(-0.05)
    expect(fns.adjustCondensationPumpValvePosition).toHaveBeenCalledWith(0.05)
    expect(fns.adjustMakeupValvePosition).toHaveBeenCalledWith(0.05)
    expect(fns.adjustRejectValvePosition).toHaveBeenCalledWith(-0.05)
  })

  it("shows flow rates of the valves that have one", () => {
    renderCondenser({ recirculationPumpValvePosition: 0.5, makeupValvePosition: 0.2, rejectValvePosition: 1 })
    expect(screen.getByLabelText("Recirculation pump flow").textContent).toBe("3700.0 l/s")
    expect(screen.getByLabelText("Makeup flow").textContent).toBe("10.0 l/s")
    expect(screen.getByLabelText("Reject flow").textContent).toBe("50.0 l/s")
  })

  it("has the pressure gauge and the hotwell level gauge", () => {
    renderCondenser({ hotwellWaterVolume: 35e3 })
    expect(screen.getByRole("meter", { name: "Pressure gauge" })).toBeTruthy()
    expect(screen.getByRole("meter", { name: "Hotwell level gauge" }).getAttribute("aria-valuenow")).toBe(
      "70",
    )
    expect(screen.getByLabelText("Hotwell level").textContent).toBe("0.7")
    expect(screen.getByLabelText("Hotwell level change").textContent).toContain("Δ")
  })

  it("lights the pressure High and Low lamps outside the band", () => {
    renderCondenser({ pressure: 100 })
    expect(screen.getByRole("img", { name: "High: on" })).toBeTruthy()
    expect(screen.getByRole("img", { name: "Low: off" })).toBeTruthy()
  })

  it("lights Low below the band", () => {
    renderCondenser({ pressure: 5 })
    expect(screen.getByRole("img", { name: "Low: on" })).toBeTruthy()
    expect(screen.getByRole("img", { name: "High: off" })).toBeTruthy()
  })

  it("shows the status readouts", () => {
    renderCondenser({ steamMass: 1234.4, hotwellTemperature: 41.26, pressure: 31.2, returnRate: 12.34 })
    expect(screen.getByLabelText("Steam volume").textContent).toBe("1234 l")
    expect(screen.getByLabelText("Hotwell temperature").textContent).toBe("41.3 °C")
    expect(screen.getByLabelText("Pressure").textContent).toBe("31 mBar")
    expect(screen.getByLabelText("Return flow").textContent).toBe("12.3 kg")
    expect(screen.getByLabelText("Intake flow")).toBeTruthy()
  })
})
