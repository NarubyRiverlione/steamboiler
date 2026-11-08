import { fireEvent, render, screen } from "@testing-library/react"
import type { ContextType } from "react"
import { describe, expect, it, vi } from "vitest"
import { PowerPlantContext } from "../context/PowerPlantContext"
import { makeInitialState } from "../context/PowerPlantReducer"
import { Clock, SpeedSelector } from "./TimeControl"
import { isSpeedLocked } from "./speedLock"
import { AnnunciatorContext, type AnnunciatorValue, type Tile } from "./useAnnunciator"

const tile = (flashing: boolean): Tile => ({ id: "burnerTripped", label: "Burner trip", part: "boiler", lit: true, flashing })

function setup(flashing: boolean, playbackSpeed = 1) {
  const setPlaybackSpeed = vi.fn()
  const plant = {
    state: makeInitialState(),
    playbackSpeed,
    simulatedSeconds: 3725,
    setPlaybackSpeed,
  } as unknown as ContextType<typeof PowerPlantContext>
  const annunciator = { tiles: [tile(flashing)] } as unknown as AnnunciatorValue
  render(
    <PowerPlantContext.Provider value={plant}>
      <AnnunciatorContext.Provider value={annunciator}>
        <Clock />
        <SpeedSelector />
      </AnnunciatorContext.Provider>
    </PowerPlantContext.Provider>,
  )
  return { setPlaybackSpeed }
}

describe("time control", () => {
  it("shows the simulated clock", () => {
    setup(false)
    expect(screen.getByLabelText("Simulated clock").textContent).toBe("1:02:05")
  })

  it("renders the clock through the board display and does not flash while running", () => {
    setup(false)
    const clock: HTMLElement = screen.getByLabelText("Simulated clock")
    expect(clock.classList.contains("board-display")).toBe(true)
    expect(clock.classList.contains("board-display-flash")).toBe(false)
  })

  it("flashes the clock while paused", () => {
    setup(false, 0)
    expect(screen.getByLabelText("Simulated clock").classList.contains("board-display-flash")).toBe(true)
  })

  it("offers Pause, 1x, 10x and 60x and sets the chosen speed", () => {
    const { setPlaybackSpeed } = setup(false)
    fireEvent.click(screen.getByRole("button", { name: "60x" }))
    expect(setPlaybackSpeed).toHaveBeenCalledWith(60)
    fireEvent.click(screen.getByRole("button", { name: "Pause" }))
    expect(setPlaybackSpeed).toHaveBeenCalledWith(0)
  })

  it("refuses speeds above 1x while an alarm is unacknowledged, but allows Pause and 1x", () => {
    setup(true)
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "10x" }).disabled).toBe(true)
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "60x" }).disabled).toBe(true)
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Pause" }).disabled).toBe(false)
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "1x" }).disabled).toBe(false)
  })

  it("allows raising the speed after ACK even while the flag is still set", () => {
    setup(false)
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "60x" }).disabled).toBe(false)
  })

  it("locks only on a flashing tile", () => {
    expect(isSpeedLocked([tile(false), tile(true)])).toBe(true)
    expect(isSpeedLocked([tile(false)])).toBe(false)
  })
})
