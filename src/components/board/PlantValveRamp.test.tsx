import { act, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import usePowerPlant from "../../context/PowerPlantContext"
import PowerPlantProvider from "../../context/PowerPlantProvider"
import { PlantValveRamp } from "./PlantValveRamp"
import { ValveControl } from "./ValveControl"
import { RAMP_TICK_MS } from "./valveRamp"

// A page of the real plant with one knob, which can be switched off like a page navigated away from
function Page() {
  const [shown, setShown] = useState<boolean>(true)
  const position: number = usePowerPlant().state.Condenser.makeupValvePosition
  return (
    <>
      <button
        onClick={() => {
          setShown((s: boolean) => !s)
        }}
      >
        toggle
      </button>
      {shown && <ValveControl ValveId="Makeup" Label="Makeup" Position={position} Step={5} />}
      <output aria-label="plant makeup">{position.toFixed(2)}</output>
    </>
  )
}

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe("PlantValveRamp", () => {
  it("moves the real plant valve toward the command after the knob's page is gone", () => {
    render(
      <PowerPlantProvider>
        <PlantValveRamp>
          <Page />
        </PlantValveRamp>
      </PowerPlantProvider>,
    )
    const start = Number(screen.getByLabelText("plant makeup").textContent)
    fireEvent.keyDown(screen.getByRole("slider", { name: "Makeup knob" }), { key: "End" })
    fireEvent.click(screen.getByText("toggle"))
    for (let elapsed = 0; elapsed < 5000; elapsed += RAMP_TICK_MS) {
      act(() => {
        vi.advanceTimersByTime(RAMP_TICK_MS)
      })
    }
    expect(Number(screen.getByLabelText("plant makeup").textContent)).toBeGreaterThan(start)
  })
})
