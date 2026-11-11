import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { ContextType } from "react"
import { PowerPlantContext } from "../../context/PowerPlantContext"
import { makeInitialState } from "../../context/PowerPlantReducer"
import type PowerPlantState from "../../context/PowerPlantState"
import { RAMP_STEP, RAMP_TICK_MS } from "../board/valveRamp"
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

// Turn a valve knob to an end; the first ramp tick dispatches one ramp step (#41)
function turnValve(label: string, key: "End" | "Home"): void {
  fireEvent.keyDown(screen.getByRole("slider", { name: `${label} knob` }), { key })
  act(() => {
    vi.advanceTimersByTime(RAMP_TICK_MS)
  })
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

  it("turns each of the five valve knobs and ramps its own action", () => {
    vi.useFakeTimers()
    const fns = renderCondenser({
      sjaeValvePosition: 0.5,
      recirculationPumpValvePosition: 0.5,
      condensationPumpValvePosition: 0.5,
      makeupValvePosition: 0.5,
      rejectValvePosition: 0.5,
    })
    turnValve("SJAE valve", "End")
    turnValve("Recirculation pump", "Home")
    turnValve("Condensation pump", "End")
    turnValve("Makeup", "End")
    turnValve("Reject", "Home")
    expect(fns.adjustSjaeValvePosition).toHaveBeenCalledWith(RAMP_STEP)
    expect(fns.adjustRecirculationPumpValvePosition).toHaveBeenCalledWith(-RAMP_STEP)
    expect(fns.adjustCondensationPumpValvePosition).toHaveBeenCalledWith(RAMP_STEP)
    expect(fns.adjustMakeupValvePosition).toHaveBeenCalledWith(RAMP_STEP)
    expect(fns.adjustRejectValvePosition).toHaveBeenCalledWith(-RAMP_STEP)
    vi.useRealTimers()
  })

  it("shows flow rates of the valves that have one", () => {
    renderCondenser({ hotwellTemperature: 40, recirculationPumpValvePosition: 0.5, makeupValvePosition: 0.2, rejectValvePosition: 1 })
    expect(screen.getByLabelText("Recirculation pump flow").textContent).toBe("3693.4 kg/s")
    expect(screen.getByLabelText("Makeup flow").textContent).toBe("9.9 kg/s")
    expect(screen.getByLabelText("Reject flow").textContent).toBe("49.6 kg/s")
  })

  it("has the pressure gauge and the hotwell level gauge", () => {
    renderCondenser({ hotwellWaterVolume: 35e3 })
    expect(screen.getByRole("meter", { name: "Pressure gauge" })).toBeTruthy()
    expect(screen.getByRole("meter", { name: "Hotwell level gauge" }).getAttribute("aria-valuenow")).toBe(
      "70",
    )
    expect(screen.getByLabelText("Hotwell level").textContent).toBe("0.7")
  })

  it("shows the hotwell level change in kg/s, + when filling", () => {
    renderCondenser({ deltaWaterMass: 0.5 })
    expect(screen.getByLabelText("Hotwell level change").textContent).toBe("+5.0 kg/s")
  })

  it("shows a draining hotwell with a minus sign", () => {
    renderCondenser({ deltaWaterMass: -0.25 })
    expect(screen.getByLabelText("Hotwell level change").textContent).toBe("-2.5 kg/s")
  })

  it("shows no sign for a hotwell change that rounds to zero", () => {
    renderCondenser({ deltaWaterMass: -0.0001 })
    expect(screen.getByLabelText("Hotwell level change").textContent).toBe("0.0 kg/s")
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
    renderCondenser({ hotwellTemperature: 41.26, pressure: 31.2, returnRate: 12.34 })
    expect(screen.getByLabelText("Hotwell temperature").textContent).toBe("41.3 °C")
    expect(screen.getByLabelText("Pressure").textContent).toBe("31 mBar")
    expect(screen.getByLabelText("Return flow").textContent).toBe("12.3 kg")
    expect(screen.getByLabelText("Intake flow")).toBeTruthy()
  })
})
