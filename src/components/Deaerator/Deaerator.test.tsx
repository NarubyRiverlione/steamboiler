import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { ContextType } from "react"
import { PowerPlantContext } from "../../context/PowerPlantContext"
import { makeInitialState } from "../../context/PowerPlantReducer"
import type PowerPlantState from "../../context/PowerPlantState"
import Deaerator from "./Deaerator"
import { warningText } from "./warningText"

type Ctx = ContextType<typeof PowerPlantContext>

function renderDeaerator(patch: Partial<PowerPlantState["Deaerator"]> = {}) {
  const state: PowerPlantState = makeInitialState()
  state.Deaerator = { ...state.Deaerator, ...patch }
  const toggleDeaeratorVent = vi.fn()
  const value = { state, dispatch: vi.fn(), toggleDeaeratorVent } as unknown as Ctx
  render(
    <PowerPlantContext.Provider value={value}>
      <Deaerator />
    </PowerPlantContext.Provider>,
  )
  return { toggleDeaeratorVent }
}

describe("Deaerator page", () => {
  it("shows temperature, pressure, saturation pressure and level", () => {
    renderDeaerator({ temperature: 133.5, pressure: 3.05, saturationPressure: 3, waterVolume: 75_000 })
    expect(screen.getByLabelText("Temperature").textContent).toBe("133.5 °C")
    expect(screen.getByLabelText("Pressure").textContent).toBe("3.05 bar")
    expect(screen.getByLabelText("Saturation pressure").textContent).toBe("3.00 bar")
    expect(screen.getByLabelText("Level").textContent).toBe("50.0 %")
  })

  it("opens the start-up vent from OPEN and closes it from CLOSE", () => {
    const shut = renderDeaerator({ startUpVentOpen: false })
    fireEvent.click(screen.getByRole("button", { name: "OPEN" }))
    expect(shut.toggleDeaeratorVent).toHaveBeenCalledTimes(1)
  })

  it("offers CLOSE while the vent is open", () => {
    renderDeaerator({ startUpVentOpen: true })
    expect(screen.getByRole("button", { name: "CLOSE" })).toBeTruthy()
  })

  it("lights the safe-to-close lamp from the state", () => {
    renderDeaerator({ safeToClose: true })
    expect(screen.getByRole("img", { name: "Safe to close: on" })).toBeTruthy()
  })

  it("shows the warning text of the flag that is set", () => {
    renderDeaerator({ warnVentClosedWithAir: true })
    expect(screen.getByRole("status", { name: "Deaerator warning" }).textContent).toMatch(/closed with air/)
  })
})

describe("warningText", () => {
  it("is empty without a flag and names the mistake for each flag", () => {
    expect(warningText(false, false)).toBe("")
    expect(warningText(true, false)).toMatch(/closed with air/)
    expect(warningText(false, true)).toMatch(/no air left/)
  })
})
