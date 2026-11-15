import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { ContextType } from "react"
import { PowerPlantContext } from "../../context/PowerPlantContext"
import { makeInitialState } from "../../context/PowerPlantReducer"
import type PowerPlantState from "../../context/PowerPlantState"
import { CstSuperheater } from "../../context/const"
import { PlantValveRamp } from "../board/PlantValveRamp"
import { RAMP_STEP, RAMP_TICK_MS } from "../board/valveRamp"
import type { GaugeZone } from "../board/RoundGauge"
import Steam from "./Steam"
import { TEMPERATURE_ZONES } from "./temperatureZones"

type Ctx = ContextType<typeof PowerPlantContext>

function renderSteam(patch: Partial<PowerPlantState["Boiler"]> = {}) {
  const state: PowerPlantState = makeInitialState()
  state.Boiler = { ...state.Boiler, ...patch }
  const setAttemperatorAuto = vi.fn()
  const adjustSprayValve = vi.fn()
  const value = { state, dispatch: vi.fn(), setAttemperatorAuto, adjustSprayValve } as unknown as Ctx
  render(
    <PowerPlantContext.Provider value={value}>
      <PlantValveRamp>
        <Steam />
      </PlantValveRamp>
    </PowerPlantContext.Provider>,
  )
  return { setAttemperatorAuto, adjustSprayValve }
}

afterEach(() => {
  vi.useRealTimers()
})

describe("Steam page", () => {
  it("derives the gauge zones from CstSuperheater", () => {
    const [green, warn, alarm]: GaugeZone[] = ["ok", "warn", "alarm"].map(
      (tone: string) => TEMPERATURE_ZONES.find((z: GaugeZone) => z.tone === tone) ?? { from: NaN, to: NaN, tone: "neutral" as const },
    )
    expect((green.from + green.to) / 2).toBe(CstSuperheater.SteamTemperature)
    expect(warn.to).toBe(CstSuperheater.AlarmTemperature)
    expect(alarm.from).toBe(CstSuperheater.AlarmTemperature)
    expect(TEMPERATURE_ZONES.map((z: GaugeZone) => z.tone)).toEqual(["neutral", "ok", "warn", "alarm"])
  })

  it("shows the steam temperature on the gauge and the LCD", () => {
    renderSteam({ steamTemperature: 541.26 })
    expect(screen.getByRole("meter", { name: "Steam temperature gauge" }).getAttribute("aria-valuenow")).toBe("541.26")
    expect(screen.getByLabelText("Steam temperature").textContent).toBe("541.3 °C")
  })

  it("shows the six readouts, superheat from the steam temperature and the boiler pressure", () => {
    renderSteam({ steamTemperature: 540, pressure: 165, superheaterHeat: 60_000, sprayValvePosition: 0.2, sprayFlow: 3, attemperatorAuto: false })
    expect(screen.getByLabelText("Superheat").textContent).toMatch(/^1\d\d\.\d K$/)
    expect(screen.getByLabelText("Superheater duty").textContent).toBe("60.0 MW")
    expect(screen.getByLabelText("Spray flow").textContent).toBe("3.0 kg/s")
    expect(screen.getByLabelText("Spray valve position").textContent).toBe("20 % Open")
  })

  it("lights the steam temperature high lamp at the alarm temperature", () => {
    renderSteam({ steamTemperature: CstSuperheater.AlarmTemperature })
    expect(screen.getByRole("img", { name: "Steam temperature high: on" })).toBeTruthy()
  })

  it("keeps the lamp off below the alarm", () => {
    renderSteam({ steamTemperature: 540 })
    expect(screen.getByRole("img", { name: "Steam temperature high: off" })).toBeTruthy()
  })

  it("moves the spray valve from the knob in Manual", () => {
    vi.useFakeTimers()
    const { adjustSprayValve } = renderSteam({ attemperatorAuto: false, sprayValvePosition: 0.5 })
    fireEvent.keyDown(screen.getByRole("slider", { name: "Spray valve knob" }), { key: "End" })
    act(() => {
      vi.advanceTimersByTime(RAMP_TICK_MS)
    })
    expect(adjustSprayValve).toHaveBeenCalledWith(RAMP_STEP)
  })

  it("moves the spray valve from the buttons in Manual", () => {
    vi.useFakeTimers()
    const { adjustSprayValve } = renderSteam({ attemperatorAuto: false, sprayValvePosition: 0.5 })
    fireEvent.click(screen.getByRole("button", { name: "Spray valve knob increase" }))
    act(() => {
      vi.advanceTimersByTime(RAMP_TICK_MS)
    })
    expect(adjustSprayValve).toHaveBeenCalledWith(RAMP_STEP)
  })

  it("disables the knob and buttons in Auto and shows why", () => {
    renderSteam({ attemperatorAuto: true })
    expect(screen.getByText("Attemperator in Auto")).toBeTruthy()
    expect(screen.queryByRole("slider", { name: "Spray valve knob" })).toBeNull()
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Spray valve knob increase" }).disabled).toBe(true)
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Spray valve knob decrease" }).disabled).toBe(true)
  })

  it("shows the Auto state on the switch and toggles it", () => {
    const auto = renderSteam({ attemperatorAuto: true })
    const sw: HTMLElement = screen.getByRole("switch", { name: "Attemperator" })
    expect(sw.getAttribute("aria-checked")).toBe("true")
    fireEvent.click(sw)
    expect(auto.setAttemperatorAuto).toHaveBeenCalledWith(false)
  })

  it("switches to Auto from Manual", () => {
    const manual = renderSteam({ attemperatorAuto: false })
    const sw: HTMLElement = screen.getByRole("switch", { name: "Attemperator" })
    expect(sw.getAttribute("aria-checked")).toBe("false")
    fireEvent.click(sw)
    expect(manual.setAttemperatorAuto).toHaveBeenCalledWith(true)
  })

  it("shows the reheater placeholder", () => {
    renderSteam()
    expect(screen.getByText("Not built yet (#150)")).toBeTruthy()
  })
})
