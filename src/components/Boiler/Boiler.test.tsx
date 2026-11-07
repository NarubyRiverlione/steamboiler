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
  const fns = { increaseGasFlow: vi.fn(), decreaseGasFlow: vi.fn(), toggleDrainValve: vi.fn() }
  const value = { state, dispatch: vi.fn(), ...fns } as unknown as Ctx
  render(
    <PowerPlantContext.Provider value={value}>
      <Boiler />
    </PowerPlantContext.Provider>,
  )
  return fns
}

describe("Boiler page", () => {
  it("steps the gas with the four buttons", () => {
    const fns = renderBoiler()
    fireEvent.click(screen.getByRole("button", { name: "+ 500 L/s" }))
    fireEvent.click(screen.getByRole("button", { name: "+ 250 L/s" }))
    fireEvent.click(screen.getByRole("button", { name: "- 250 L/s" }))
    fireEvent.click(screen.getByRole("button", { name: "- 500 L/s" }))
    expect(fns.increaseGasFlow.mock.calls).toEqual([[500], [250]])
    expect(fns.decreaseGasFlow.mock.calls).toEqual([[250], [500]])
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

  it("shows the readouts and the advanced section", () => {
    renderBoiler({ temperature: 120.04, ventedTotal: 2500 })
    expect(screen.getByLabelText("Temperature").textContent).toBe("120.0 °C")
    expect(screen.getByLabelText("Vented").textContent).toBe("2.5 t vented")
    expect(screen.getByText("Advanced")).toBeTruthy()
    expect(screen.getByLabelText("Steam removal")).toBeTruthy()
  })
})
