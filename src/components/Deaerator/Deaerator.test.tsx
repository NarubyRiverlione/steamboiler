import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { ContextType } from "react"
import { PowerPlantContext } from "../../context/PowerPlantContext"
import { makeInitialState } from "../../context/PowerPlantReducer"
import type PowerPlantState from "../../context/PowerPlantState"
import Deaerator from "./Deaerator"
import { PlantValveRamp } from "../board/PlantValveRamp"
import { RAMP_STEP, RAMP_TICK_MS } from "../board/valveRamp"
import { warningText } from "./warningText"

type Ctx = ContextType<typeof PowerPlantContext>

function renderDeaerator(patch: Partial<PowerPlantState["Deaerator"]> = {}) {
  const state: PowerPlantState = makeInitialState()
  state.Deaerator = { ...state.Deaerator, ...patch }
  const toggleDeaeratorVent = vi.fn()
  const adjustFeedPumpValvePosition = vi.fn()
  const value = {
    state,
    dispatch: vi.fn(),
    toggleDeaeratorVent,
    adjustFeedPumpValvePosition,
  } as unknown as Ctx
  render(
    <PowerPlantContext.Provider value={value}>
      <PlantValveRamp>
        <Deaerator />
      </PlantValveRamp>
    </PowerPlantContext.Provider>,
  )
  return { toggleDeaeratorVent, adjustFeedPumpValvePosition }
}

describe("Deaerator page", () => {
  it("shows the level zones: red, orange and the green band", () => {
    renderDeaerator()
    const tones: (string | null)[] = Array.from(document.querySelectorAll("rect.board-zone-bar")).map((e: Element) => e.getAttribute("data-tone"))
    expect(tones).toEqual(["alarm", "alarm", "warn", "warn", "ok"])
  })

  it("shows temperature, pressure, saturation pressure", () => {
    renderDeaerator({ temperature: 133.5, pressure: 3.05, saturationPressure: 3, waterVolume: 75_000 })
    expect(screen.getByLabelText("Temperature").textContent).toBe("133.5 °C")
    expect(screen.getByLabelText("Pressure").textContent).toBe("3.05 bar")
    expect(screen.getByLabelText("Saturation pressure").textContent).toBe("3.00 bar")
  })

  it("shows the level as a fraction with the gauge and the signed change in kg/s", () => {
    renderDeaerator({ waterVolume: 75_000, deltaWaterMass: 0.5 })
    expect(screen.getByRole("meter", { name: "Deaerator level gauge" }).getAttribute("aria-valuenow")).toBe(
      "50",
    )
    expect(screen.getByLabelText("Deaerator level").textContent).toBe("0.50")
    expect(screen.getByLabelText("Deaerator level change").textContent).toBe("+5.0 kg/s")
  })

  it("shows a draining deaerator with a minus sign", () => {
    renderDeaerator({ deltaWaterMass: -0.25 })
    expect(screen.getByLabelText("Deaerator level change").textContent).toBe("-2.5 kg/s")
  })

  it("toggles the start-up vent from its switch", () => {
    const shut = renderDeaerator({ startUpVentOpen: false })
    const vent: HTMLElement = screen.getByRole("switch", { name: "Start-up vent" })
    expect(vent.getAttribute("aria-checked")).toBe("false")
    fireEvent.click(vent)
    expect(shut.toggleDeaeratorVent).toHaveBeenCalledTimes(1)
  })

  it("shows the vent switch on OPEN while the vent is open", () => {
    renderDeaerator({ startUpVentOpen: true })
    expect(screen.getByRole("switch", { name: "Start-up vent" }).getAttribute("aria-checked")).toBe("true")
  })

  it("lights the safe-to-close lamp from the state", () => {
    renderDeaerator({ safeToClose: true })
    expect(screen.getByRole("img", { name: "Safe to close: on" })).toBeTruthy()
  })

  it("shows the feed pump flow and lights the trip lamp from the state", () => {
    renderDeaerator({ temperature: 134, feedPumpValvePosition: 0.5, feedPumpTripped: true })
    expect(screen.getByLabelText("Feed pump flow").textContent).toBe("139.7 kg/s")
    expect(screen.getByRole("img", { name: "Feed pump trip: on" })).toBeTruthy()
  })

  it("steps the feed pump valve from its control", () => {
    vi.useFakeTimers()
    const { adjustFeedPumpValvePosition } = renderDeaerator({ feedPumpValvePosition: 0.5 })
    fireEvent.keyDown(screen.getByRole("slider", { name: "Feed pump knob" }), { key: "End" })
    act(() => {
      vi.advanceTimersByTime(RAMP_TICK_MS)
    })
    expect(adjustFeedPumpValvePosition).toHaveBeenCalledWith(RAMP_STEP)
    vi.useRealTimers()
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

  it("lights the Turbine lamp on tap flow and the Boiler lamp on let-down flow", () => {
    renderDeaerator({ extractionFlow: 20, letDownFlow: 0 })
    expect(screen.getByRole("img", { name: "Turbine: on" })).toBeTruthy()
    expect(screen.getByRole("img", { name: "Boiler: off" })).toBeTruthy()
  })

  it("lights the Boiler lamp alone when only the let-down valve passes steam", () => {
    renderDeaerator({ extractionFlow: 0, letDownFlow: 10 })
    expect(screen.getByRole("img", { name: "Boiler: on" })).toBeTruthy()
    expect(screen.getByRole("img", { name: "Turbine: off" })).toBeTruthy()
  })

  it("keeps both source lamps off below the small-flow threshold", () => {
    renderDeaerator({ extractionFlow: 0.2, letDownFlow: 0.2 })
    expect(screen.getByRole("img", { name: "Boiler: off" })).toBeTruthy()
    expect(screen.getByRole("img", { name: "Turbine: off" })).toBeTruthy()
  })
})
