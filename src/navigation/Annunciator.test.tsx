import { fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import { describe, expect, it } from "vitest"
import type { ContextType } from "react"
import { CstSimulation } from "../context/const"
import { PowerPlantContext } from "../context/PowerPlantContext"
import { makeInitialState } from "../context/PowerPlantReducer"
import type PowerPlantState from "../context/PowerPlantState"
import { AnnunciatorProvider } from "./AnnunciatorProvider"
import Annunciator from "./Annunciator"
import { useAnnunciator } from "./useAnnunciator"
import { isSpeedLocked } from "./speedLock"

function Clear() {
  const { clearLatches } = useAnnunciator()
  return <button type="button" onClick={clearLatches}>clear-latches</button>
}

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>
}

function stateWith(flags: { heat?: boolean; burner?: boolean; pump?: boolean; turbine?: boolean; hotwellLevel?: number }): PowerPlantState {
  const state: PowerPlantState = makeInitialState()
  if (flags.hotwellLevel !== undefined) state.Condenser.hotwellWaterVolume = flags.hotwellLevel * CstSimulation.CstCondenser.TotalVolume
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
          <Clear />
        </AnnunciatorProvider>
      </MemoryRouter>
    </PowerPlantContext.Provider>
  )
}

const tile = (name: string): HTMLElement => screen.getByRole("button", { name, hidden: true })
const flashing = (name: string): boolean => tile(name).className.includes("board-tile-flash")
const ack = (): void => { fireEvent.click(screen.getByRole("button", { name: "ACK" })) }
const reset = (): void => { fireEvent.click(screen.getByRole("button", { name: "RESET" })) }
const toggle = (): HTMLElement => screen.getByRole("button", { name: "Annunciator" })
const master = (kind: "error" | "warning"): string => screen.getByRole("img", { name: new RegExp("Master " + kind) }).getAttribute("data-state") ?? ""
const lit = (name: string): boolean => tile(name).className.includes("board-tile-lit")

describe("Annunciator", () => {
  it("has one tile per alarm flag, all dark while nothing is set", () => {
    render(tree(stateWith({})))
    for (const name of ["Heating rate over limit", "Burner trip", "Condensation pump trip", "Turbine trip", "Hotwell level low", "Hotwell level high"]) {
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

  it("makes a flashing tile steady on ACK and leaves a tile that trips later flashing", () => {
    const { rerender } = render(tree(stateWith({ turbine: true })))
    ack()
    expect(lit("Turbine trip")).toBe(true)
    expect(flashing("Turbine trip")).toBe(false)
    rerender(tree(stateWith({ turbine: true, burner: true })))
    expect(flashing("Burner trip")).toBe(true)
    expect(flashing("Turbine trip")).toBe(false)
  })

  it("goes dark when the flag clears while still flashing", () => {
    const { rerender } = render(tree(stateWith({ turbine: true })))
    rerender(tree(stateWith({})))
    expect(lit("Turbine trip")).toBe(false)
    expect(flashing("Turbine trip")).toBe(false)
  })

  it("stays lit and steady when the flag clears while steady", () => {
    const { rerender } = render(tree(stateWith({ turbine: true })))
    ack()
    rerender(tree(stateWith({})))
    expect(lit("Turbine trip")).toBe(true)
    expect(flashing("Turbine trip")).toBe(false)
  })

  it("ignores RESET while the flag is still set", () => {
    render(tree(stateWith({ turbine: true })))
    ack()
    reset()
    expect(lit("Turbine trip")).toBe(true)
    expect(flashing("Turbine trip")).toBe(false)
  })

  it("darkens a steady tile on RESET once its flag is clear", () => {
    const { rerender } = render(tree(stateWith({ turbine: true })))
    ack()
    rerender(tree(stateWith({})))
    reset()
    expect(lit("Turbine trip")).toBe(false)
  })

  it("does not darken a flashing tile on RESET", () => {
    render(tree(stateWith({ turbine: true })))
    reset()
    expect(flashing("Turbine trip")).toBe(true)
  })

  it("stays steady when the flag re-trips while the tile is latched", () => {
    const { rerender } = render(tree(stateWith({ turbine: true })))
    ack()
    rerender(tree(stateWith({})))
    rerender(tree(stateWith({ turbine: true })))
    expect(lit("Turbine trip")).toBe(true)
    expect(flashing("Turbine trip")).toBe(false)
  })

  it("flashes again on a trip after RESET", () => {
    const { rerender } = render(tree(stateWith({ turbine: true })))
    ack()
    rerender(tree(stateWith({})))
    reset()
    rerender(tree(stateWith({ turbine: true })))
    expect(flashing("Turbine trip")).toBe(true)
  })

  it("clears flashing and steady tiles together when a preset loads", () => {
    render(tree(stateWith({ turbine: true, burner: true })))
    fireEvent.click(tile("Turbine trip"))
    ack()
    fireEvent.click(screen.getByRole("button", { name: "clear-latches" }))
    expect(flashing("Turbine trip")).toBe(true)
    expect(flashing("Burner trip")).toBe(true)
  })

  it("has a RESET button and no TEST button", () => {
    render(tree(stateWith({})))
    expect(screen.getByRole("button", { name: "RESET" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "TEST" })).toBeNull()
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
    for (const name of ["Hotwell level low", "Hotwell level high"]) expect(tile(name).className).toContain("board-tile-warning")
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

  it("lights each hotwell tile from the level and opens the condenser", () => {
    const { rerender } = render(tree(stateWith({ hotwellLevel: 0.2 })))
    expect(lit("Hotwell level low")).toBe(true)
    expect(lit("Hotwell level high")).toBe(false)
    rerender(tree(stateWith({ hotwellLevel: 0.9 })))
    expect(lit("Hotwell level low")).toBe(false)
    expect(lit("Hotwell level high")).toBe(true)
    fireEvent.click(tile("Hotwell level high"))
    expect(screen.getByTestId("where").textContent).toBe("/condenser")
  })

  it("starts folded with a keyboard-operable toggle that sets aria-expanded", () => {
    render(tree(stateWith({})))
    expect(toggle().getAttribute("aria-expanded")).toBe("false")
    expect(screen.queryByRole("button", { name: "Turbine trip" })).toBeNull()
    fireEvent.click(toggle())
    expect(toggle().getAttribute("aria-expanded")).toBe("true")
    expect(screen.getByRole("button", { name: "Turbine trip" })).toBeTruthy()
    fireEvent.click(toggle())
    expect(toggle().getAttribute("aria-expanded")).toBe("false")
  })

  it("folds on Esc, on an outside click, and after opening a part, but not on a click inside", () => {
    render(tree(stateWith({})))
    fireEvent.click(toggle())
    fireEvent.mouseDown(screen.getByRole("button", { name: "ACK" }))
    expect(toggle().getAttribute("aria-expanded")).toBe("true")
    fireEvent.keyDown(document.body, { key: "Escape" })
    expect(toggle().getAttribute("aria-expanded")).toBe("false")
    fireEvent.click(toggle())
    fireEvent.mouseDown(document.body)
    expect(toggle().getAttribute("aria-expanded")).toBe("false")
    fireEvent.click(toggle())
    fireEvent.click(screen.getByRole("button", { name: "Turbine trip" }))
    expect(toggle().getAttribute("aria-expanded")).toBe("false")
  })

  it("leaves an Esc that was already handled (the Presets popup) alone", () => {
    render(tree(stateWith({})))
    fireEvent.click(toggle())
    const handled: KeyboardEvent = new KeyboardEvent("keydown", { key: "Escape", cancelable: true, bubbles: true })
    handled.preventDefault()
    document.body.dispatchEvent(handled)
    expect(toggle().getAttribute("aria-expanded")).toBe("true")
  })

  it("does not set aria-pressed on the toggle", () => {
    render(tree(stateWith({})))
    expect(toggle().hasAttribute("aria-pressed")).toBe(false)
  })

  it("groups the tiles by owning part", () => {
    render(tree(stateWith({})))
    fireEvent.click(toggle())
    const group = (name: string): HTMLElement => screen.getByRole("region", { name })
    expect(within(group("Boiler")).getAllByRole("button").map((b: HTMLElement) => b.textContent)).toEqual(["Heating rate over limit", "Burner trip"])
    expect(within(group("Condenser")).getAllByRole("button")).toHaveLength(3)
    expect(within(group("Turbine")).getAllByRole("button")).toHaveLength(1)
    expect(screen.queryByRole("region", { name: "Deaerator" })).toBeNull()
  })

  it("never opens the panel by itself when an annunciation arrives", () => {
    const { rerender } = render(tree(stateWith({})))
    rerender(tree(stateWith({ turbine: true })))
    expect(toggle().getAttribute("aria-expanded")).toBe("false")
    expect(master("error")).toBe("flashing")
  })

  it("drives the master lights: off, flashing, steady, red over yellow", () => {
    const { rerender } = render(tree(stateWith({})))
    expect([master("error"), master("warning")]).toEqual(["off", "off"])
    rerender(tree(stateWith({ heat: true })))
    expect([master("error"), master("warning")]).toEqual(["off", "flashing"])
    ack()
    expect([master("error"), master("warning")]).toEqual(["off", "steady"])
    rerender(tree(stateWith({ heat: true, turbine: true })))
    expect([master("error"), master("warning")]).toEqual(["flashing", "off"])
    ack()
    expect([master("error"), master("warning")]).toEqual(["steady", "off"])
  })

  it("flashes a master while any tile of its severity is unacknowledged", () => {
    const { rerender } = render(tree(stateWith({ turbine: true })))
    ack()
    rerender(tree(stateWith({ turbine: true, burner: true })))
    expect(master("error")).toBe("flashing")
  })

  it("ACK and RESET work while folded", () => {
    const { rerender } = render(tree(stateWith({ turbine: true })))
    expect(toggle().getAttribute("aria-expanded")).toBe("false")
    ack()
    expect(master("error")).toBe("steady")
    rerender(tree(stateWith({})))
    reset()
    expect(master("error")).toBe("off")
  })

  it("keeps the speed lock following flashing while folded", () => {
    function Probe() {
      return <p data-testid="locked">{String(isSpeedLocked(useAnnunciator().tiles))}</p>
    }
    const locked = (): string => screen.getByTestId("locked").textContent ?? ""
    const probed = (state: PowerPlantState) => {
      const value = { state, dispatch: (): void => undefined } as unknown as ContextType<typeof PowerPlantContext>
      return (
        <PowerPlantContext.Provider value={value}>
          <MemoryRouter>
            <AnnunciatorProvider>
              <Annunciator />
              <Probe />
            </AnnunciatorProvider>
          </MemoryRouter>
        </PowerPlantContext.Provider>
      )
    }
    render(probed(stateWith({ turbine: true })))
    expect(toggle().getAttribute("aria-expanded")).toBe("false")
    expect(locked()).toBe("true")
    ack()
    expect(locked()).toBe("false")
  })

  it("throws a clear error outside the provider", () => {
    expect(() => render(<MemoryRouter><Annunciator /></MemoryRouter>)).toThrow(/AnnunciatorProvider/)
  })
})
