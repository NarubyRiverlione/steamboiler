import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { ContextType } from "react"
import { PowerPlantContext } from "../context/PowerPlantContext"
import { makeInitialState } from "../context/PowerPlantReducer"
import { START_PRESETS, presetState, type StartPreset } from "../context/startPresets"
import { AnnunciatorContext, type AnnunciatorValue } from "./useAnnunciator"
import PresetsButton from "./PresetsButton"
import { MemoryRouter, useLocation } from "react-router-dom"
import { useBoardKeys } from "./useBoardKeys"

function Keys() {
  useBoardKeys()
  return <p data-testid="where">{useLocation().pathname}</p>
}

function setup() {
  const dispatch = vi.fn()
  const clearAcknowledgements = vi.fn()
  const plant = { state: makeInitialState(), dispatch } as unknown as ContextType<typeof PowerPlantContext>
  const annunciator = { clearAcknowledgements } as unknown as AnnunciatorValue
  render(
    <PowerPlantContext.Provider value={plant}>
      <AnnunciatorContext.Provider value={annunciator}>
        <PresetsButton />
      </AnnunciatorContext.Provider>
    </PowerPlantContext.Provider>,
  )
  return { dispatch, clearAcknowledgements }
}

const open = (): void => { fireEvent.click(screen.getByRole("button", { name: "Presets" })) }

describe("Presets button and popup", () => {
  it("is closed until the button is pressed, then lists the three presets", () => {
    setup()
    expect(screen.queryByRole("dialog")).toBeNull()
    open()
    expect(screen.getByRole("dialog", { name: "Presets" })).toBeTruthy()
    for (const label of ["Cold & dark", "Hot standby", "At pressure"]) expect(screen.getByRole("button", { name: new RegExp(label) })).toBeTruthy()
  })

  it.each(START_PRESETS.map((p: StartPreset) => [p.label, p] as const))("choosing %s loads its state, clears acks and closes", (label: string, preset: StartPreset) => {
    const { dispatch, clearAcknowledgements } = setup()
    open()
    fireEvent.click(screen.getByRole("button", { name: new RegExp(label) }))
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: "LOAD_STATE", payload: { state: presetState(preset) } })
    expect(clearAcknowledgements).toHaveBeenCalledOnce()
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("closes without changing the plant via the close button, Escape and a click outside", () => {
    const { dispatch, clearAcknowledgements } = setup()
    open()
    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    expect(screen.queryByRole("dialog")).toBeNull()
    open()
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
    expect(screen.queryByRole("dialog")).toBeNull()
    open()
    fireEvent.click(screen.getByTestId("presets-backdrop"))
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(dispatch).not.toHaveBeenCalled()
    expect(clearAcknowledgements).not.toHaveBeenCalled()
  })

  it("a click inside the popup does not close it", () => {
    setup()
    open()
    fireEvent.click(screen.getByRole("dialog"))
    expect(screen.getByRole("dialog")).toBeTruthy()
  })

  it("moves focus in, traps Tab, and returns focus to the button on close", () => {
    setup()
    const button: HTMLElement = screen.getByRole("button", { name: "Presets" })
    button.focus()
    open()
    const dialog: HTMLElement = screen.getByRole("dialog")
    expect(dialog.contains(document.activeElement)).toBe(true)
    const targets: HTMLElement[] = Array.from(dialog.querySelectorAll<HTMLElement>("button"))
    targets[targets.length - 1].focus()
    fireEvent.keyDown(dialog, { key: "Tab" })
    expect(document.activeElement).toBe(targets[0])
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true })
    expect(document.activeElement).toBe(targets[targets.length - 1])
    fireEvent.keyDown(dialog, { key: "Escape" })
    expect(document.activeElement).toBe(button)
  })

  it("keeps the board keys (Esc, Page Up/Down) from navigating while the popup is open", () => {
    const plant = { state: makeInitialState(), dispatch: vi.fn() } as unknown as ContextType<typeof PowerPlantContext>
    const annunciator = { clearAcknowledgements: vi.fn() } as unknown as AnnunciatorValue
    render(
      <PowerPlantContext.Provider value={plant}>
        <AnnunciatorContext.Provider value={annunciator}>
          <MemoryRouter initialEntries={["/boiler"]}>
            <Keys />
            <PresetsButton />
          </MemoryRouter>
        </AnnunciatorContext.Provider>
      </PowerPlantContext.Provider>,
    )
    open()
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "PageDown" })
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
    expect(screen.getByTestId("where").textContent).toBe("/boiler")
  })
})
