import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { ContextType } from "react"
import { PowerPlantContext } from "../../context/PowerPlantContext"
import { makeInitialState } from "../../context/PowerPlantReducer"
import type PowerPlantState from "../../context/PowerPlantState"
import TurbineAux from "./TurbineAux"

type Ctx = ContextType<typeof PowerPlantContext>

function renderAux(
  oil: Partial<PowerPlantState["Oil"]> = {},
  turbine: Partial<PowerPlantState["Turbine"]> = {},
  condenser: Partial<PowerPlantState["Condenser"]> = {},
) {
  const state: PowerPlantState = makeInitialState()
  state.Oil = { ...state.Oil, ...oil }
  state.Turbine = { ...state.Turbine, ...turbine }
  state.Condenser = { ...state.Condenser, ...condenser }
  const fns = { toggleOilPump: vi.fn(), toggleTurningGear: vi.fn(), toggleGlandSteam: vi.fn() }
  const value = { state, dispatch: vi.fn(), ...fns } as unknown as Ctx
  render(
    <PowerPlantContext.Provider value={value}>
      <TurbineAux />
    </PowerPlantContext.Provider>,
  )
  return fns
}

const makeCtx = (s: PowerPlantState): Ctx =>
  ({
    state: s,
    dispatch: vi.fn(),
    toggleOilPump: vi.fn(),
    toggleTurningGear: vi.fn(),
    toggleGlandSteam: vi.fn(),
  }) as unknown as Ctx

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
      expect(screen.getByLabelText("Rotor speed").textContent).toBe("3.0 rpm")
    })

    it("refuses engaging without lube oil pressure", () => {
      const fns = renderAux({ pumpRunning: false, headerPressure: 0 }, { turningGearEngaged: false, rpm: 0 })
      const gear: HTMLElement = screen.getByRole("switch", { name: "Turning gear" })
      expect(gear.getAttribute("aria-disabled")).toBe("true")
      expect(gear.querySelector("title")?.textContent).toBe("Lube oil pressure is below the permissive")
      fireEvent.click(gear)
      expect(fns.toggleTurningGear).not.toHaveBeenCalled()
    })

    it("lights the three permissive lamps and enables the switch when the gear can be engaged", () => {
      renderAux({ pumpRunning: true, headerPressure: 1 }, { turningGearEngaged: false, rpm: 0 })
      for (const name of ["Aux bus live", "Oil pressure OK", "Rotor at standstill"]) {
        expect(screen.getByRole("img", { name: `${name}: on` })).toBeTruthy()
      }
      expect(screen.getByRole("switch", { name: "Turning gear" }).getAttribute("aria-disabled")).not.toBe(
        "true",
      )
      expect(screen.getByRole("switch", { name: "Turning gear" }).getAttribute("aria-checked")).toBe("false")
    })

    it("darks the oil lamp without oil and the standstill lamp on a turning rotor", () => {
      renderAux({ pumpRunning: false, headerPressure: 0 }, { turningGearEngaged: false, rpm: 150 })
      expect(screen.getByRole("img", { name: "Oil pressure OK: off" })).toBeTruthy()
      expect(screen.getByRole("img", { name: "Rotor at standstill: off" })).toBeTruthy()
      expect(screen.getByRole("img", { name: "Aux bus live: on" })).toBeTruthy()
    })

    it.each([
      ["a dead aux bus", false, 1, 0, "Aux bus live"],
      ["oil below the permissive", true, 0, 0, "Oil pressure OK"],
      ["a rotor above standstill", true, 1, 150, "Rotor at standstill"],
    ])("darks exactly one lamp and disables the switch with %s", (_name, bus, pressure, rpm, dark) => {
      const state: PowerPlantState = makeInitialState()
      state.gridSupplyBreaker = bus
      state.dieselBreaker = false
      state.Turbine = { ...state.Turbine, unitAuxBreaker: false, turningGearEngaged: false, rpm }
      state.Oil = { ...state.Oil, pumpRunning: pressure > 0, headerPressure: pressure }
      render(
        <PowerPlantContext.Provider value={makeCtx(state)}>
          <TurbineAux />
        </PowerPlantContext.Provider>,
      )
      for (const name of ["Aux bus live", "Oil pressure OK", "Rotor at standstill"]) {
        expect(screen.getByRole("img", { name: `${name}: ${name === dark ? "off" : "on"}` })).toBeTruthy()
      }
      expect(screen.getByRole("switch", { name: "Turning gear" }).getAttribute("aria-disabled")).toBe("true")
    })

    it("still lets the operator disengage when the oil is gone", () => {
      const fns = renderAux({ pumpRunning: false, headerPressure: 0 }, { turningGearEngaged: true, rpm: 3 })
      fireEvent.click(screen.getByRole("switch", { name: "Turning gear" }))
      expect(fns.toggleTurningGear).toHaveBeenCalledTimes(1)
    })

    it("shows the gear thrown out by the steam as the switch at OUT, with no gear state readout", () => {
      renderAux({ pumpRunning: true, headerPressure: 1 }, { turningGearEngaged: false, rpm: 150 })
      expect(screen.queryByLabelText("Gear state")).toBeNull()
      expect(screen.getByRole("switch", { name: "Turning gear" }).getAttribute("aria-checked")).toBe("false")
    })
  })
})

describe("Gland steam group", () => {
  it("toggles the gland steam with the switch while the rotor turns", () => {
    const fns = renderAux({}, { turningGearEngaged: true })
    const sw: HTMLElement = screen.getByRole("switch", { name: "Gland steam" })
    expect(sw.getAttribute("aria-checked")).toBe("false")
    fireEvent.click(sw)
    expect(fns.toggleGlandSteam).toHaveBeenCalledTimes(1)
  })

  it("refuses the admission on a stopped rotor with the Rotor turning lamp dark", () => {
    const fns = renderAux({}, { turningGearEngaged: false, rpm: 0 })
    const sw: HTMLElement = screen.getByRole("switch", { name: "Gland steam" })
    fireEvent.click(sw)
    expect(fns.toggleGlandSteam).not.toHaveBeenCalled()
    expect(sw.querySelector("title")?.textContent).toBe(
      "The rotor must be turning: engage the turning gear first",
    )
    expect(screen.getByRole("img", { name: "Rotor turning: off" })).toBeTruthy()
  })

  it("lights the Rotor turning lamp while the gear holds the rotor", () => {
    renderAux({}, { turningGearEngaged: true })
    expect(screen.getByRole("img", { name: "Rotor turning: on" })).toBeTruthy()
  })

  it("has no message line on the page", () => {
    renderAux({}, { turningGearEngaged: false, rpm: 0 })
    expect(document.querySelector(".board-lcd-msg")).toBeNull()
  })

  it("always lets the steam be shut off", () => {
    const fns = renderAux({}, { glandSteamOn: true, turningGearEngaged: false, rpm: 0 })
    fireEvent.click(screen.getByRole("switch", { name: "Gland steam" }))
    expect(fns.toggleGlandSteam).toHaveBeenCalledTimes(1)
  })

  it("shows the seal state, the air in-leakage effect and the condenser vacuum", () => {
    renderAux({}, { glandSteamOn: true, turningGearEngaged: true }, { pressure: 42 })
    expect(screen.getByLabelText("Seal state").textContent).toContain("Sealed")
    expect(screen.getByLabelText("Air in-leakage").textContent).toContain("Low")
    expect(screen.getByLabelText("Condenser pressure").textContent).toContain("42 mBar")
  })

  it("shows unsealed glands as an air in-leakage that degrades the vacuum", () => {
    renderAux({}, { glandSteamOn: false, turningGearEngaged: true })
    expect(screen.getByLabelText("Seal state").textContent).toContain("Unsealed")
    expect(screen.getByLabelText("Air in-leakage").textContent).toContain("High")
  })
})
