import { act, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import { describe, expect, it } from "vitest"
import type { ContextType } from "react"
import { PowerPlantContext } from "../context/PowerPlantContext"
import { makeInitialState } from "../context/PowerPlantReducer"
import type PowerPlantState from "../context/PowerPlantState"
import { AnnunciatorProvider } from "./AnnunciatorProvider"
import Annunciator from "./Annunciator"

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>
}

function stateWith(flags: { heat?: boolean; burner?: boolean; pump?: boolean; turbine?: boolean }): PowerPlantState {
  const state: PowerPlantState = makeInitialState()
  state.Boiler.heatingRateOverLimit = flags.heat === true
  state.Boiler.burnerTripped = flags.burner === true
  state.Condenser.condensationPumpTripped = flags.pump === true
  state.Turbine.turbineTripped = flags.turbine === true
  return state
}

function tree(state: PowerPlantState) {
  const value = { state, dispatch: (): void => undefined } as unknown as ContextType<typeof PowerPlantContext>
  return (
    <PowerPlantContext.Provider value={value}>
      <MemoryRouter initialEntries={["/"]}>
        <AnnunciatorProvider>
          <Routes>
            <Route path="*" element={<Annunciator />} />
          </Routes>
          <Where />
        </AnnunciatorProvider>
      </MemoryRouter>
    </PowerPlantContext.Provider>
  )
}

const tile = (name: string): HTMLElement => screen.getByRole("button", { name })
const flashing = (name: string): boolean => tile(name).className.includes("board-tile-flash")
const lit = (name: string): boolean => tile(name).className.includes("board-tile-lit")

describe("Annunciator", () => {
  it("has one tile per alarm flag, all dark while nothing is set", () => {
    render(tree(stateWith({})))
    for (const name of ["Heating rate over limit", "Burner trip", "Condensation pump trip", "Turbine trip"]) {
      expect(lit(name)).toBe(false)
      expect(flashing(name)).toBe(false)
    }
  })

  it("lights a tile from its flag and flashes it until acknowledged", () => {
    render(tree(stateWith({ turbine: true })))
    expect(lit("Turbine trip")).toBe(true)
    expect(flashing("Turbine trip")).toBe(true)
    expect(lit("Burner trip")).toBe(false)
  })

  it("stops the flashing on ACK but keeps the tile lit while the flag is set", () => {
    const { rerender } = render(tree(stateWith({ turbine: true })))
    fireEvent.click(screen.getByRole("button", { name: "ACK" }))
    expect(lit("Turbine trip")).toBe(true)
    expect(flashing("Turbine trip")).toBe(false)
    rerender(tree(stateWith({ turbine: true, burner: true })))
    expect(flashing("Burner trip")).toBe(true)
    expect(flashing("Turbine trip")).toBe(false)
  })

  it("goes dark when the flag clears and flashes again on the next trip", () => {
    const { rerender } = render(tree(stateWith({ turbine: true })))
    fireEvent.click(screen.getByRole("button", { name: "ACK" }))
    rerender(tree(stateWith({})))
    expect(lit("Turbine trip")).toBe(false)
    rerender(tree(stateWith({ turbine: true })))
    expect(flashing("Turbine trip")).toBe(true)
  })

  it("lights every tile while TEST is held, without flashing, and restores them after", () => {
    render(tree(stateWith({})))
    const test: HTMLElement = screen.getByRole("button", { name: "TEST" })
    fireEvent.pointerDown(test)
    expect(test.getAttribute("aria-pressed")).toBe("true")
    expect(lit("Heating rate over limit")).toBe(true)
    expect(lit("Condensation pump trip")).toBe(true)
    expect(flashing("Burner trip")).toBe(false)
    fireEvent.pointerUp(test)
    expect(lit("Heating rate over limit")).toBe(false)
  })

  it("lights on TEST via the keyboard and ends it on key up or blur", () => {
    render(tree(stateWith({})))
    const test: HTMLElement = screen.getByRole("button", { name: "TEST" })
    fireEvent.keyDown(test, { key: " " })
    expect(lit("Burner trip")).toBe(true)
    fireEvent.keyUp(test, { key: " " })
    expect(lit("Burner trip")).toBe(false)
    fireEvent.keyDown(test, { key: "Enter" })
    expect(lit("Burner trip")).toBe(true)
    act(() => { test.blur(); })
    fireEvent.pointerLeave(test)
    expect(lit("Burner trip")).toBe(false)
  })

  it("opens the part that owns the alarm", () => {
    render(tree(stateWith({})))
    fireEvent.click(tile("Condensation pump trip"))
    expect(screen.getByTestId("where").textContent).toBe("/condenser")
    fireEvent.click(tile("Heating rate over limit"))
    expect(screen.getByTestId("where").textContent).toBe("/boiler")
    fireEvent.click(tile("Turbine trip"))
    expect(screen.getByTestId("where").textContent).toBe("/turbine")
  })

  it("colours a tile by its alarm severity: warning yellow, error red", () => {
    render(tree(stateWith({})))
    expect(tile("Heating rate over limit").className).toContain("board-tile-warning")
    for (const name of ["Burner trip", "Condensation pump trip", "Turbine trip"]) {
      expect(tile(name).className).toContain("board-tile-error")
      expect(tile(name).className).not.toContain("board-tile-warning")
    }
  })

  it("keeps the severity colour class while flashing and while steady", () => {
    render(tree(stateWith({ heat: true, burner: true })))
    expect(flashing("Heating rate over limit")).toBe(true)
    expect(tile("Heating rate over limit").className).toContain("board-tile-warning")
    expect(tile("Burner trip").className).toContain("board-tile-error")
    fireEvent.click(screen.getByRole("button", { name: "ACK" }))
    expect(flashing("Heating rate over limit")).toBe(false)
    expect(lit("Heating rate over limit")).toBe(true)
    expect(tile("Heating rate over limit").className).toContain("board-tile-warning")
    expect(tile("Burner trip").className).toContain("board-tile-error")
  })

  it("throws a clear error outside the provider", () => {
    expect(() => render(<MemoryRouter><Annunciator /></MemoryRouter>)).toThrow(/AnnunciatorProvider/)
  })
})
