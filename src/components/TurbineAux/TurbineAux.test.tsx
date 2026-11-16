import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { ContextType } from "react"
import { PowerPlantContext } from "../../context/PowerPlantContext"
import { makeInitialState } from "../../context/PowerPlantReducer"
import type PowerPlantState from "../../context/PowerPlantState"
import TurbineAux from "./TurbineAux"

type Ctx = ContextType<typeof PowerPlantContext>

function renderAux(oil: Partial<PowerPlantState["Oil"]> = {}) {
  const state: PowerPlantState = makeInitialState()
  state.Oil = { ...state.Oil, ...oil }
  const fns = { toggleOilPump: vi.fn() }
  const value = { state, dispatch: vi.fn(), ...fns } as unknown as Ctx
  render(
    <PowerPlantContext.Provider value={value}>
      <TurbineAux />
    </PowerPlantContext.Provider>,
  )
  return fns
}

describe("Turbine aux page", () => {
  it("has the page heading and the lube oil group", () => {
    renderAux()
    expect(screen.getByRole("heading", { name: "Turbine aux" })).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Lube Oil" })).toBeTruthy()
  })

  it("shows the pump position and toggles the pump with the switch", () => {
    const fns = renderAux({ pumpRunning: false, headerPressure: 0 })
    const pump: HTMLElement = screen.getByRole("switch", { name: "Oil pump" })
    expect(pump.getAttribute("aria-checked")).toBe("false")
    fireEvent.click(pump)
    expect(fns.toggleOilPump).toHaveBeenCalledTimes(1)
  })

  it("shows a running pump as on", () => {
    renderAux({ pumpRunning: true, headerPressure: 1 })
    expect(screen.getByRole("switch", { name: "Oil pump" }).getAttribute("aria-checked")).toBe("true")
  })

  it("shows the header pressure on the dial and the LCD, with the limits marked", () => {
    renderAux({ pumpRunning: true, headerPressure: 0.55 })
    const dial: HTMLElement = screen.getByRole("meter", { name: "Lube oil header pressure" })
    expect(dial.getAttribute("aria-valuenow")).toBe("0.55")
    expect(screen.getByLabelText("Header pressure").textContent).toBe("0.55 bar g")
    expect(dial.querySelector("path[data-tone='alarm']")).not.toBeNull()
    expect(dial.querySelector("path[data-tone='warn']")).not.toBeNull()
    expect(dial.querySelector("path[data-tone='ok']")).not.toBeNull()
    expect(screen.getByText(/Permissive 0\.7 bar g, trip 0\.4 bar g/)).toBeTruthy()
  })

  it("lights the Oil pressure low lamp below the permissive pressure only", () => {
    renderAux({ headerPressure: 0.5 })
    expect(screen.getByRole("img", { name: "Oil pressure low: on" })).toBeTruthy()
  })

  it("leaves the lamp dark at nominal pressure", () => {
    renderAux({ pumpRunning: true, headerPressure: 1 })
    expect(screen.getByRole("img", { name: "Oil pressure low: off" })).toBeTruthy()
  })
})
