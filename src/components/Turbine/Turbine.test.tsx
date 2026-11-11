import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { ContextType } from "react"
import { PowerPlantContext } from "../../context/PowerPlantContext"
import { makeInitialState } from "../../context/PowerPlantReducer"
import type PowerPlantState from "../../context/PowerPlantState"
import { RAMP_STEP, RAMP_TICK_MS } from "../board/valveRamp"
import Turbine from "./Turbine"

type Ctx = ContextType<typeof PowerPlantContext>

function renderTurbine(patch: Partial<PowerPlantState["Turbine"]> = {}, boilerPressure?: number) {
  const state: PowerPlantState = makeInitialState()
  state.Turbine = { ...state.Turbine, ...patch }
  if (boilerPressure !== undefined) state.Boiler = { ...state.Boiler, pressure: boilerPressure }
  const fns = {
    toggleMainSteamValve: vi.fn(),
    adjustBypassValve: vi.fn(),
    adjustTurbineValve: vi.fn(),
    setSpeedMode: vi.fn(),
    selectRunUpPoint: vi.fn(),
    toggleGeneratorBreaker: vi.fn(),
    setLoadSetpoint: vi.fn(),
  }
  const value = { state, dispatch: vi.fn(), ...fns } as unknown as Ctx
  render(
    <PowerPlantContext.Provider value={value}>
      <Turbine />
    </PowerPlantContext.Provider>,
  )
  return fns
}

// Turn a valve knob to an end; the first ramp tick dispatches one ramp step (#41)
function turnValve(label: string, key: "End" | "Home"): void {
  fireEvent.keyDown(screen.getByRole("slider", { name: `${label} knob` }), { key })
  act(() => {
    vi.advanceTimersByTime(RAMP_TICK_MS)
  })
}

describe("Turbine page", () => {
  it("turns the bypass and turbine valve knobs and ramps their own actions", () => {
    vi.useFakeTimers()
    const fns = renderTurbine({ bypassValvePosition: 0.5, turbineValvePosition: 0.5 })
    turnValve("Bypass valve", "End")
    turnValve("Turbine valve", "Home")
    expect(fns.adjustBypassValve).toHaveBeenCalledWith(RAMP_STEP)
    expect(fns.adjustTurbineValve).toHaveBeenCalledWith(-RAMP_STEP)
    vi.useRealTimers()
  })

  it("shows the bypass flow", () => {
    renderTurbine({ bypassSteamFlowOut: 12.34 })
    expect(screen.getByLabelText("Bypass valve flow").textContent).toBe("12.3 kg/s")
  })

  it("shows the turbine valve flow and no % open on either valve", () => {
    renderTurbine({ turbineSteamFlowOut: 45.67 })
    expect(screen.getByLabelText("Turbine valve flow").textContent).toBe("45.7 kg/s")
    expect(screen.queryByLabelText("Turbine valve position")).toBeNull()
    expect(screen.queryByLabelText("Bypass valve position")).toBeNull()
  })

  it("toggles the main steam valve, lit while open", () => {
    const fns = renderTurbine({ mainSteamValve: true })
    const msv: HTMLElement = within(screen.getByRole("group", { name: "Main steam valve" })).getByRole(
      "button",
    )
    expect(msv.textContent).toBe("Open")
    expect(msv.getAttribute("aria-pressed")).toBe("true")
    fireEvent.click(msv)
    expect(fns.toggleMainSteamValve).toHaveBeenCalledTimes(1)
  })

  it("lights the opening-not-possible lamp below the MSV minimum pressure", () => {
    renderTurbine({ mainSteamValve: false }, 1)
    expect(screen.getByRole("img", { name: "Opening not possible: on" })).toBeTruthy()
  })

  it("keeps that lamp dark at working pressure", () => {
    renderTurbine({ mainSteamValve: false }, 150)
    expect(screen.getByRole("img", { name: "Opening not possible: off" })).toBeTruthy()
  })

  it("selects a speed mode, refusing ramp up with the valve closed", () => {
    const fns = renderTurbine({ mainSteamValve: false, speedMode: "free" })
    const ramp: HTMLButtonElement = screen.getByRole("button", { name: "Ramp up" })
    expect(ramp.disabled).toBe(true)
    expect(ramp.title).toBe("Open the main steam valve first")
    const free: HTMLElement = screen.getByRole("button", { name: "Free" })
    expect(free.getAttribute("aria-pressed")).toBe("true")
    fireEvent.click(ramp)
    expect(fns.setSpeedMode).not.toHaveBeenCalled()
  })

  it("sets the speed mode when allowed", () => {
    const fns = renderTurbine({ mainSteamValve: true, speedMode: "free" })
    fireEvent.click(screen.getByRole("button", { name: "Ramp up" }))
    expect(fns.setSpeedMode).toHaveBeenCalledWith("rampUp")
  })

  it("selects a run-up point and marks the chosen one", () => {
    const fns = renderTurbine({ mainSteamValve: true, runUpPoint: 1500 })
    expect(screen.getByRole("button", { name: "1500 rpm" }).getAttribute("aria-pressed")).toBe("true")
    fireEvent.click(screen.getByRole("button", { name: "3000 rpm" }))
    expect(fns.selectRunUpPoint).toHaveBeenCalledWith(3000)
  })

  it("has a round RPM dial", () => {
    renderTurbine({ rpm: 1234 })
    expect(screen.getByRole("meter", { name: "Speed gauge" }).getAttribute("aria-valuenow")).toBe("1234")
    expect(screen.getByLabelText("Turbine speed").textContent).toBe("1234 RPM")
  })

  it("has knobs for the load setpoint and the two valves", () => {
    renderTurbine({ loadSetpoint: 80, bypassValvePosition: 0.2 })
    expect(screen.getByRole("meter", { name: "Load setpoint knob" }).getAttribute("aria-valuenow")).toBe("80")
    expect(screen.getByRole("slider", { name: "Bypass valve knob" }).getAttribute("aria-valuenow")).toBe("20")
    expect(screen.getByRole("slider", { name: "Turbine valve knob" })).toBeTruthy()
  })

  it("lights the sync LED and lets the breaker close within the band", () => {
    const fns = renderTurbine({ rpm: 3001, generatorBreaker: false })
    expect(screen.getByRole("img", { name: "Ready to close: on" })).toBeTruthy()
    const breaker: HTMLButtonElement = screen.getByRole("button", { name: "Breaker Open" })
    expect(breaker.disabled).toBe(false)
    fireEvent.click(breaker)
    expect(fns.toggleGeneratorBreaker).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/can only be closed/)).toBeNull()
  })

  it("blocks the breaker outside the band and says why", () => {
    renderTurbine({ rpm: 2500, generatorBreaker: false })
    expect(screen.getByRole("img", { name: "Ready to close: off" })).toBeTruthy()
    const blocked: HTMLButtonElement = screen.getByRole("button", { name: "Breaker Open" })
    expect(blocked.disabled).toBe(true)
    expect(screen.getByText(/between 2998 and 3002/).textContent).toContain("Current RPM: 2500")
  })

  it("can always open a closed breaker", () => {
    const fns = renderTurbine({ rpm: 2500, generatorBreaker: true })
    const breaker: HTMLButtonElement = screen.getByRole("button", { name: "Breaker Closed" })
    expect(breaker.disabled).toBe(false)
    expect(breaker.getAttribute("aria-pressed")).toBe("true")
    fireEvent.click(breaker)
    expect(fns.toggleGeneratorBreaker).toHaveBeenCalledTimes(1)
  })

  it("applies a typed load setpoint on Enter and ignores garbage", () => {
    const fns = renderTurbine({ generatorBreaker: true, rpm: 3000 })
    const input: HTMLInputElement = screen.getByLabelText("Load setpoint (MW)")
    fireEvent.change(input, { target: { value: "120" } })
    fireEvent.keyDown(input, { key: "Enter" })
    expect(fns.setLoadSetpoint).toHaveBeenCalledWith(120)
    fireEvent.blur(input)
    expect(fns.setLoadSetpoint).toHaveBeenCalledTimes(1)
  })

  it("applies the load setpoint on blur", () => {
    const fns = renderTurbine({ generatorBreaker: true, rpm: 3000 })
    const input: HTMLInputElement = screen.getByLabelText("Load setpoint (MW)")
    fireEvent.change(input, { target: { value: "55" } })
    fireEvent.blur(input)
    expect(fns.setLoadSetpoint).toHaveBeenCalledWith(55)
  })

  it("disables the load setpoint with the reason when the breaker is open", () => {
    renderTurbine({ generatorBreaker: false })
    const field: HTMLInputElement = screen.getByLabelText("Load setpoint (MW)")
    expect(field.disabled).toBe(true)
    expect(screen.getByText("Close the generator breaker first")).toBeTruthy()
  })

  it("shows the status readouts and the trip lamp", () => {
    renderTurbine({
      electricOutput: 42.34,
      loadSetpoint: 50,
      runUpPoint: 1500,
      speedMode: "hold",
      generatorBreaker: true,
      turbineTripped: true,
    })
    expect(screen.getByLabelText("Generator load").textContent).toBe("42.3 MW")
    expect(screen.getByLabelText("Load setpoint").textContent).toBe("50.0 MW")
    expect(screen.getByLabelText("Run-up point").textContent).toBe("1500 RPM")
    expect(screen.getByLabelText("Speed mode").textContent).toBe("HOLD")
    expect(screen.getByLabelText("Breaker").textContent).toBe("CLOSED")
    expect(screen.getByLabelText("Steam flow")).toBeTruthy()
    expect(screen.getByRole("img", { name: "Turbine trip: on" })).toBeTruthy()
  })
})
