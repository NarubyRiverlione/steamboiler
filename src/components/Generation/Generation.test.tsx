import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { ContextType } from "react"
import { PowerPlantContext } from "../../context/PowerPlantContext"
import { makeInitialState } from "../../context/PowerPlantReducer"
import type PowerPlantState from "../../context/PowerPlantState"
import Generation from "./Generation"

type Ctx = ContextType<typeof PowerPlantContext>

function renderGeneration(patch: Partial<PowerPlantState["Turbine"]> = {}, top: Partial<PowerPlantState> = {}) {
  const state: PowerPlantState = { ...makeInitialState(), ...top }
  state.Turbine = { ...state.Turbine, ...patch }
  const fns = { toggleGeneratorBreaker: vi.fn(), setLoadSetpoint: vi.fn() }
  const value = { state, dispatch: vi.fn(), ...fns } as unknown as Ctx
  render(
    <PowerPlantContext.Provider value={value}>
      <Generation />
    </PowerPlantContext.Provider>,
  )
  return fns
}

describe("Generation page", () => {
  it("shows the speed beside the breaker, the load knob and the status readouts", () => {
    renderGeneration({ rpm: 2999.6, loadSetpoint: 80, electricOutput: 42.34, generatorBreaker: true })
    expect(screen.getByRole("heading", { name: "Generation" })).toBeTruthy()
    expect(screen.getByLabelText("Turbine speed").textContent).toBe("3000 RPM")
    expect(screen.getByRole("slider", { name: "Load setpoint knob" }).getAttribute("aria-valuenow")).toBe(
      "80",
    )
    expect(screen.getByLabelText("Generator load").textContent).toBe("42.3 MW")
    expect(screen.getByLabelText("Load setpoint").textContent).toBe("80.0 MW")
    expect(screen.getByLabelText("Breaker").textContent).toBe("CLOSED")
  })

  it("shows the load dial with the actual load and the setpoint, and no MOCKUP note", () => {
    renderGeneration({ loadSetpoint: 100, electricOutput: 60, generatorBreaker: true })
    const dial: HTMLElement = screen.getByRole("meter", { name: "Generator load dial" })
    expect(dial.getAttribute("aria-valuenow")).toBe("60")
    expect(dial.getAttribute("aria-valuemax")).toBe("200")
    expect(dial.getAttribute("aria-valuetext")).toBe("60 MW, setpoint 100 MW")
    expect(dial.querySelector("path[data-tone='warn']")).not.toBeNull()
    expect(screen.queryByText("MOCKUP")).toBeNull()
  })

  it("turns the load setpoint with the arrow keys, Home and End, within 0 to the limit", () => {
    const fns = renderGeneration({ generatorBreaker: true, loadSetpoint: 100 })
    const knob: HTMLElement = screen.getByRole("slider", { name: "Load setpoint knob" })
    fireEvent.keyDown(knob, { key: "ArrowUp" })
    expect(fns.setLoadSetpoint).toHaveBeenLastCalledWith(105)
    fireEvent.keyDown(knob, { key: "ArrowDown" })
    expect(fns.setLoadSetpoint).toHaveBeenLastCalledWith(95)
    fireEvent.keyDown(knob, { key: "End" })
    expect(fns.setLoadSetpoint).toHaveBeenLastCalledWith(200)
    fireEvent.keyDown(knob, { key: "Home" })
    expect(fns.setLoadSetpoint).toHaveBeenLastCalledWith(0)
  })

  it("clamps the knob at the ends", () => {
    const fns = renderGeneration({ generatorBreaker: true, loadSetpoint: 198 })
    fireEvent.keyDown(screen.getByRole("slider", { name: "Load setpoint knob" }), { key: "ArrowUp" })
    expect(fns.setLoadSetpoint).toHaveBeenLastCalledWith(200)
  })

  it("turns the load setpoint with the wheel", () => {
    const fns = renderGeneration({ generatorBreaker: true, loadSetpoint: 100 })
    fireEvent.wheel(screen.getByRole("slider", { name: "Load setpoint knob" }), { deltaY: -100 })
    expect(fns.setLoadSetpoint).toHaveBeenLastCalledWith(105)
  })

  it("turns the load setpoint with a drag, in whole MW", () => {
    const fns = renderGeneration({ generatorBreaker: true, loadSetpoint: 100 })
    const knob: HTMLElement = screen.getByRole("slider", { name: "Load setpoint knob" })
    Object.assign(knob, { setPointerCapture: vi.fn() })
    fireEvent.pointerDown(knob, { clientX: 100, pointerId: 1 })
    fireEvent.pointerMove(knob, { clientX: 140, pointerId: 1 })
    const value: number = fns.setLoadSetpoint.mock.lastCall?.[0] as number
    expect(value).toBeGreaterThan(100)
    expect(Number.isInteger(value)).toBe(true)
  })

  it("leaves the knob inert with the breaker open and shows the reason", () => {
    const fns = renderGeneration({ generatorBreaker: false })
    const knob: HTMLElement = screen.getByRole("meter", { name: "Load setpoint knob" })
    fireEvent.keyDown(knob, { key: "ArrowUp" })
    fireEvent.wheel(knob, { deltaY: -100 })
    expect(fns.setLoadSetpoint).not.toHaveBeenCalled()
    expect(screen.queryByRole("slider", { name: "Load setpoint knob" })).toBeNull()
    expect(screen.getByText("Close the generator breaker first")).toBeTruthy()
  })

  it("has no speed gauge, trip lamp or speed controls", () => {
    renderGeneration()
    expect(screen.queryByRole("meter", { name: "Speed gauge" })).toBeNull()
    expect(screen.queryByRole("img", { name: /Turbine trip/ })).toBeNull()
    expect(screen.queryByRole("button", { name: "Ramp up" })).toBeNull()
  })

  it("lights the sync LED and lets the breaker close within the band", () => {
    const fns = renderGeneration({ rpm: 3001, generatorBreaker: false })
    expect(screen.getByRole("img", { name: "Ready to close: on" })).toBeTruthy()
    const breaker: HTMLElement = screen.getByRole("switch", { name: "Generator breaker, cover down" })
    expect(breaker.getAttribute("aria-disabled")).toBeNull()
    fireEvent.click(breaker)
    expect(fns.toggleGeneratorBreaker).not.toHaveBeenCalled()
    expect(screen.getByRole("switch", { name: "Generator breaker, cover up" })).toBeTruthy()
    fireEvent.click(screen.getByRole("switch", { name: "Generator breaker, cover up" }))
    expect(fns.toggleGeneratorBreaker).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/outside the synchronising window/)).toBeNull()
  })

  it("blocks the breaker outside the band and says why", () => {
    const fns = renderGeneration({ rpm: 2500, generatorBreaker: false })
    expect(screen.getByRole("img", { name: "Ready to close: off" })).toBeTruthy()
    const blocked: HTMLElement = screen.getByRole("switch", { name: "Generator breaker, cover down" })
    expect(blocked.getAttribute("aria-disabled")).toBe("true")
    fireEvent.click(blocked)
    expect(screen.getByRole("switch", { name: "Generator breaker, cover up" })).toBeTruthy() // the cover still lifts
    fireEvent.click(screen.getByRole("switch", { name: "Generator breaker, cover up" }))
    expect(fns.toggleGeneratorBreaker).not.toHaveBeenCalled() // only the handle refuses
    expect(screen.getByText("Speed is outside the synchronising window")).toBeTruthy()
  })

  it("can always open a closed breaker", () => {
    const fns = renderGeneration({ rpm: 2500, generatorBreaker: true })
    const breaker: HTMLElement = screen.getByRole("switch", { name: "Generator breaker, cover down" })
    expect(breaker.getAttribute("aria-disabled")).toBeNull()
    expect(breaker.getAttribute("aria-checked")).toBe("true")
    fireEvent.click(breaker)
    fireEvent.click(screen.getByRole("switch", { name: "Generator breaker, cover up" }))
    expect(fns.toggleGeneratorBreaker).toHaveBeenCalledTimes(1)
  })

  it("applies a typed load setpoint on Enter and ignores garbage", () => {
    const fns = renderGeneration({ generatorBreaker: true, rpm: 3000 })
    const input: HTMLInputElement = screen.getByLabelText("Load setpoint (MW)")
    fireEvent.change(input, { target: { value: "120" } })
    fireEvent.keyDown(input, { key: "Enter" })
    expect(fns.setLoadSetpoint).toHaveBeenCalledWith(120)
    fireEvent.blur(input)
    expect(fns.setLoadSetpoint).toHaveBeenCalledTimes(1)
  })

  it("applies the load setpoint on blur", () => {
    const fns = renderGeneration({ generatorBreaker: true, rpm: 3000 })
    const input: HTMLInputElement = screen.getByLabelText("Load setpoint (MW)")
    fireEvent.change(input, { target: { value: "55" } })
    fireEvent.blur(input)
    expect(fns.setLoadSetpoint).toHaveBeenCalledWith(55)
  })

  it("disables the load setpoint with the reason when the breaker is open", () => {
    renderGeneration({ generatorBreaker: false })
    const field: HTMLInputElement = screen.getByLabelText("Load setpoint (MW)")
    expect(field.disabled).toBe(true)
    expect(screen.getByText("Close the generator breaker first")).toBeTruthy()
  })

  it("shows the net output, negative by its minus sign only", () => {
    renderGeneration({ electricOutput: 0, generatorBreaker: false }, { auxiliaryLoad: 4.2 })
    expect(screen.getByLabelText("Net output").textContent).toBe("-4.2 MW")
  })

  it("shows the net output as generator load minus auxiliary load", () => {
    renderGeneration({ electricOutput: 50, generatorBreaker: true }, { auxiliaryLoad: 4.5 })
    expect(screen.getByLabelText("Net output").textContent).toBe("45.5 MW")
  })

  it("lights Grid supply closed and leaves the setpoint enabled with the grid supply closed", () => {
    renderGeneration({ generatorBreaker: true }, { gridSupplyBreaker: true })
    expect(screen.getByRole("img", { name: "Grid supply closed: on" })).toBeTruthy()
    expect(screen.getByLabelText<HTMLInputElement>("Load setpoint (MW)").disabled).toBe(false)
  })

  it("in house load operation unlights the lamp and disables the setpoint controls with the sim's reason", () => {
    const fns = renderGeneration({ generatorBreaker: true }, { gridSupplyBreaker: false })
    expect(screen.getByRole("img", { name: "Grid supply closed: off" })).toBeTruthy()
    const field: HTMLInputElement = screen.getByLabelText("Load setpoint (MW)")
    expect(field.disabled).toBe(true)
    expect(field.title).toBe("House load operation: the grid supply breaker is open")
    expect(screen.queryByText("House load operation: the grid supply breaker is open")).toBeNull() // a tooltip only, no message line
    fireEvent.keyDown(screen.getByRole("meter", { name: "Load setpoint knob" }), { key: "ArrowUp" })
    expect(fns.setLoadSetpoint).not.toHaveBeenCalled()
  })
})
