import { render, screen } from "@testing-library/react"
import type { ContextType } from "react"
import { describe, expect, it } from "vitest"
import { PowerPlantContext } from "../context/PowerPlantContext"
import { makeInitialState } from "../context/PowerPlantReducer"
import type PowerPlantState from "../context/PowerPlantState"
import PlantValues from "./PlantValues"

function plant(pressure: number, electricOutput: number, loadSetpoint = 0): ContextType<typeof PowerPlantContext> {
  const base: PowerPlantState = makeInitialState()
  const state: PowerPlantState = {
    ...base,
    Boiler: { ...base.Boiler, pressure },
    Turbine: { ...base.Turbine, electricOutput, loadSetpoint },
  }
  return { state } as unknown as ContextType<typeof PowerPlantContext>
}

const ui = (value: ContextType<typeof PowerPlantContext>) => (
  <PowerPlantContext.Provider value={value}>
    <PlantValues />
  </PowerPlantContext.Provider>
)

describe("header plant values", () => {
  it("shows boiler pressure in bar and generated output in MW, one decimal each", () => {
    render(ui(plant(42.34, 12.56)))
    expect(screen.getByLabelText("Boiler pressure").textContent).toBe("42.3 bar")
    expect(screen.getByLabelText("Output").textContent).toBe("12.6 MW")
  })

  it("reads the real output, not the load setpoint", () => {
    render(ui(plant(1, 0, 50)))
    expect(screen.getByLabelText("Output").textContent).toBe("0.0 MW")
  })

  it("uses plain LCD colour and fixed-width boxes", () => {
    render(ui(plant(250, 99)))
    for (const label of ["Boiler pressure", "Output"]) {
      const el: HTMLElement = screen.getByLabelText(label)
      expect(el.classList.contains("board-display-alarm")).toBe(false)
      expect(el.classList.contains("board-display-fixed")).toBe(true)
    }
  })

  it("updates when the plant state changes", () => {
    const { rerender } = render(ui(plant(10, 0)))
    rerender(ui(plant(10, 30)))
    expect(screen.getByLabelText("Output").textContent).toBe("30.0 MW")
  })
})
