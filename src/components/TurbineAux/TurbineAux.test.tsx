import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { ContextType } from "react"
import { PowerPlantContext } from "../../context/PowerPlantContext"
import { makeInitialState } from "../../context/PowerPlantReducer"
import type PowerPlantState from "../../context/PowerPlantState"
import TurbineAux from "./TurbineAux"

type Ctx = ContextType<typeof PowerPlantContext>

function renderAux(oil: Partial<PowerPlantState["Oil"]> = {}, turbine: Partial<PowerPlantState["Turbine"]> = {}) {
  const state: PowerPlantState = makeInitialState()
  state.Oil = { ...state.Oil, ...oil }
  state.Turbine = { ...state.Turbine, ...turbine }
  const fns = { toggleOilPump: vi.fn(), toggleTurningGear: vi.fn() }
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

  describe("turning gear", () => {
    it("has its own group", () => {
      renderAux()
      expect(screen.getByRole("heading", { name: "Turning gear" })).toBeTruthy()
    })

    it("turns the gear with the switch when the oil is up", () => {
      const fns = renderAux({ pumpRunning: true, headerPressure: 1 }, { turningGearEngaged: false, rpm: 0 })
      const gear: HTMLElement = screen.getByRole("switch", { name: "Turning gear" })
      expect(gear.getAttribute("aria-checked")).toBe("false")
      fireEvent.click(gear)
      expect(fns.toggleTurningGear).toHaveBeenCalledTimes(1)
    })

    it("shows the engaged gear and the slow rotor speed", () => {
      renderAux({ pumpRunning: true, headerPressure: 1 }, { turningGearEngaged: true, rpm: 3 })
      expect(screen.getByRole("switch", { name: "Turning gear" }).getAttribute("aria-checked")).toBe("true")
      expect(screen.getByLabelText("Gear state").textContent).toBe("Engaged")
      expect(screen.getByLabelText("Rotor speed").textContent).toBe("3.0 rpm")
    })

    it("refuses engaging without lube oil pressure and says why", () => {
      const fns = renderAux({ pumpRunning: false, headerPressure: 0 }, { turningGearEngaged: false, rpm: 0 })
      const gear: HTMLElement = screen.getByRole("switch", { name: "Turning gear" })
      expect(gear.getAttribute("aria-disabled")).toBe("true")
      expect(screen.getByText("Lube oil pressure is below the permissive", { selector: "p" })).toBeTruthy()
      fireEvent.click(gear)
      expect(fns.toggleTurningGear).not.toHaveBeenCalled()
    })

    it("shows no refusal when the gear can be engaged", () => {
      renderAux({ pumpRunning: true, headerPressure: 1 }, { turningGearEngaged: false, rpm: 0 })
      expect(screen.queryByText(/permissive$/, { selector: "p" })).toBeNull()
      expect(screen.getByLabelText("Gear state").textContent).toBe("Out")
    })

    it("still lets the operator disengage when the oil is gone", () => {
      const fns = renderAux({ pumpRunning: false, headerPressure: 0 }, { turningGearEngaged: true, rpm: 3 })
      fireEvent.click(screen.getByRole("switch", { name: "Turning gear" }))
      expect(fns.toggleTurningGear).toHaveBeenCalledTimes(1)
    })

    it("shows the gear thrown out by the steam when the rotor rolls off it", () => {
      renderAux({ pumpRunning: true, headerPressure: 1 }, { turningGearEngaged: false, rpm: 150 })
      expect(screen.getByLabelText("Gear state").textContent).toBe("Thrown out by the steam")
      expect(screen.getByRole("switch", { name: "Turning gear" }).getAttribute("aria-checked")).toBe("false")
    })
  })
})
