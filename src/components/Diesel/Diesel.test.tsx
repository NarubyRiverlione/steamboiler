import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { ContextType } from "react"
import { PowerPlantContext } from "../../context/PowerPlantContext"
import { makeInitialState } from "../../context/PowerPlantReducer"
import type PowerPlantState from "../../context/PowerPlantState"
import Diesel from "./Diesel"

type Ctx = ContextType<typeof PowerPlantContext>

function renderPage(status: "stopped" | "starting" | "running" = "stopped", patch: Partial<PowerPlantState> = {}) {
  const state: PowerPlantState = { ...makeInitialState(), gridSupplyBreaker: false, ...patch }
  state.Diesel = { status, startElapsed: 0 }
  const fns = { setDieselRun: vi.fn(), toggleDieselBreaker: vi.fn() }
  render(
    <PowerPlantContext.Provider value={{ state, dispatch: vi.fn(), ...fns } as unknown as Ctx}>
      <Diesel />
    </PowerPlantContext.Provider>,
  )
  return fns
}

const liftCover = (): HTMLElement => {
  fireEvent.click(screen.getByRole("switch", { name: "Diesel breaker, cover down" }))
  return screen.getByRole("switch", { name: "Diesel breaker, cover up" })
}
const lamp = (name: string, on: boolean): HTMLElement => screen.getByRole("img", { name: `${name}: ${on ? "on" : "off"}` })

describe("Diesel generator page", () => {
  it("starts the diesel with RUN and stops it with STOP", () => {
    const stopped = renderPage("stopped")
    fireEvent.click(screen.getByRole("switch", { name: "Diesel run" }))
    expect(stopped.setDieselRun).toHaveBeenCalledWith(true)
  })

  it("stops a running diesel", () => {
    const fns = renderPage("running")
    fireEvent.click(screen.getByRole("switch", { name: "Diesel run" }))
    expect(fns.setDieselRun).toHaveBeenCalledWith(false)
  })

  it("lights Starting, then Running, and neither when stopped", () => {
    renderPage("starting")
    expect(lamp("Starting", true)).toBeTruthy()
    expect(lamp("Running", false)).toBeTruthy()
  })

  it("lights Running when running", () => {
    renderPage("running")
    expect(lamp("Starting", false)).toBeTruthy()
    expect(lamp("Running", true)).toBeTruthy()
  })

  it("lights neither lamp when stopped", () => {
    renderPage("stopped")
    expect(lamp("Starting", false)).toBeTruthy()
    expect(lamp("Running", false)).toBeTruthy()
  })

  it("refuses the close while not running: lamp unlit, breaker disabled with the reason", () => {
    renderPage("starting")
    expect(lamp("Ready to close", false)).toBeTruthy()
    const breaker: HTMLElement = liftCover()
    expect(breaker.getAttribute("aria-disabled")).toBe("true")
    expect(breaker.getAttribute("title")).toBe("The diesel is still starting")
  })

  it("lights Ready to close and closes when running, through its cover", () => {
    const fns = renderPage("running")
    expect(lamp("Ready to close", true)).toBeTruthy()
    const breaker: HTMLElement = liftCover()
    expect(breaker.getAttribute("aria-disabled")).toBeNull()
    fireEvent.click(breaker)
    expect(fns.toggleDieselBreaker).toHaveBeenCalledTimes(1)
  })

  it("does not light Ready to close with the breaker closed, and can still open it", () => {
    const fns = renderPage("running", { dieselBreaker: true })
    expect(lamp("Ready to close", false)).toBeTruthy()
    const breaker: HTMLElement = liftCover()
    expect(breaker.getAttribute("aria-disabled")).toBeNull()
    fireEvent.click(breaker)
    expect(fns.toggleDieselBreaker).toHaveBeenCalledTimes(1)
  })

  it("shows the auxiliary load on the gauge only while the diesel is the sole supply", () => {
    renderPage("running", { dieselBreaker: true, Oil: { pumpRunning: true, headerPressure: 1 } })
    expect(Number(screen.getByRole("meter", { name: "Diesel output" }).getAttribute("aria-valuenow"))).toBeGreaterThan(0)
  })

  it("reads 0 on the gauge with the breaker open", () => {
    renderPage("running")
    expect(screen.getByRole("meter", { name: "Diesel output" }).getAttribute("aria-valuenow")).toBe("0")
  })
})
