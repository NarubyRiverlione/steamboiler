import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { ContextType } from "react"
import { PowerPlantContext } from "../../context/PowerPlantContext"
import { makeInitialState } from "../../context/PowerPlantReducer"
import type PowerPlantState from "../../context/PowerPlantState"
import Boiler from "./Boiler"

type Ctx = ContextType<typeof PowerPlantContext>

function renderBoiler(patch: Partial<PowerPlantState["Boiler"]> = {}) {
  const state: PowerPlantState = makeInitialState()
  state.Boiler = { ...state.Boiler, ...patch }
  const fns = { setGasRate: vi.fn(), toggleDrainValve: vi.fn() }
  const value = { state, dispatch: vi.fn(), ...fns } as unknown as Ctx
  render(
    <PowerPlantContext.Provider value={value}>
      <Boiler />
    </PowerPlantContext.Provider>,
  )
  return fns
}

describe("Boiler page", () => {
  it("turns the gas knob with the keyboard and passes the command on", () => {
    const fns = renderBoiler({ gasRateCommand: 0.5 })
    fireEvent.keyDown(screen.getByRole("slider", { name: "Gas knob" }), { key: "ArrowRight" })
    expect(fns.setGasRate).toHaveBeenCalledWith(0.6)
  })

  it("shows the actual gas flow on the LCD, not the knob position", () => {
    renderBoiler({ gasFlow: 6000, gasRateCommand: -0.5 })
    expect(screen.getByLabelText("Gas flow").textContent).toBe("6000 l/s")
    expect(screen.getByRole("slider", { name: "Gas knob" }).getAttribute("aria-valuenow")).toBe("-0.5")
  })

  it("shows a forgotten knob: rising, falling or holding", () => {
    renderBoiler({ gasRateCommand: 0.5 })
    expect(screen.getByRole("status", { name: "Gas trend" }).textContent).toBe("▲ RISING")
  })

  it("shows falling for a knob turned left and holding in the dead zone", () => {
    renderBoiler({ gasRateCommand: -0.5 })
    expect(screen.getByRole("status", { name: "Gas trend" }).textContent).toBe("▼ FALLING")
  })

  it("holds in the dead zone", () => {
    renderBoiler({ gasRateCommand: 0.02 })
    expect(screen.getByRole("status", { name: "Gas trend" }).textContent).toBe("HOLDING")
  })

  it("toggles the drain valve and shows its state", () => {
    const fns = renderBoiler({ drainValveOpen: true })
    const button: HTMLElement = screen.getByRole("button", { name: "Open" })
    expect(button.getAttribute("aria-pressed")).toBe("true")
    fireEvent.click(button)
    expect(fns.toggleDrainValve).toHaveBeenCalledTimes(1)
  })

  it("has the pressure gauge and the drum level gauge with its low-low zone", () => {
    renderBoiler({ waterVolume: 35e3 })
    expect(document.querySelectorAll("rect[data-tone='alarm']").length).toBe(1)
    expect(screen.getByRole("meter", { name: "Pressure gauge" })).toBeTruthy()
    expect(screen.getByRole("meter", { name: "Drum level gauge" }).getAttribute("aria-valuenow")).toBe("35")
  })

  it("lights the alarm lamps from the flags", () => {
    renderBoiler({ burnerTripped: true, heatingRateOverLimit: true, reliefValveOpen: false })
    expect(screen.getByRole("img", { name: "Tripped: on" })).toBeTruthy()
    expect(screen.getByRole("img", { name: "Over limit: on" })).toBeTruthy()
    expect(screen.getByRole("img", { name: "Open: off" })).toBeTruthy()
    expect(screen.getByLabelText("Heating rate").classList.contains("board-display-alarm")).toBe(true)
  })

  it("shows the stack temperature and the boiler efficiency", () => {
    renderBoiler({ stackTemperature: 187.3, boilerEfficiency: 0.916 })
    expect(screen.getByLabelText("Stack temperature").textContent).toBe("187 °C")
    expect(screen.getByLabelText("Boiler efficiency").textContent).toBe("91.6 %")
  })

  it("shows the readouts and the advanced section", () => {
    renderBoiler({ temperature: 120.04, ventedTotal: 2500 })
    expect(screen.getByLabelText("Temperature").textContent).toBe("120.0 °C")
    expect(screen.getByLabelText("Vented").textContent).toBe("2.5 t vented")
    expect(screen.getByText("Advanced")).toBeTruthy()
    expect(screen.getByLabelText("Steam removal")).toBeTruthy()
  })
})
