import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { BreakerSwitch } from "./BreakerSwitch"

type RenderOptions = {
  readonly on?: boolean
  readonly disabled?: boolean
  readonly title?: string
  readonly lifted?: boolean
}

function renderBreaker(options: RenderOptions = {}) {
  const onToggle = vi.fn()
  const onToggleCover = vi.fn()
  render(
    <BreakerSwitch
      label="Test breaker"
      plate="Generator"
      rating="10.5 kV · CB-G1"
      on={options.on ?? false}
      onToggle={onToggle}
      disabled={options.disabled}
      title={options.title}
      guard={options.lifted === undefined ? undefined : { lifted: options.lifted, onToggleCover }}
    />,
  )
  return { onToggle, onToggleCover, sw: screen.getByRole("switch") }
}

const flagPosition = (): string | null =>
  document.querySelector("[data-position]")?.getAttribute("data-position") ?? null

describe("BreakerSwitch", () => {
  it("shows the nameplate", () => {
    renderBreaker()
    expect(screen.getByText("Generator")).toBeTruthy()
    expect(screen.getByText("10.5 kV · CB-G1")).toBeTruthy()
  })

  it("shows a green O OPEN flag and is not checked while open", () => {
    const { sw } = renderBreaker({ on: false })
    expect(flagPosition()).toBe("open")
    expect(screen.getByText("OPEN")).toBeTruthy()
    expect(sw.getAttribute("aria-checked")).toBe("false")
    expect(document.querySelector(".board-breaker-rocker-off")).not.toBeNull()
  })

  it("shows a red I CLOSED flag and is checked while closed", () => {
    const { sw } = renderBreaker({ on: true })
    expect(flagPosition()).toBe("closed")
    expect(screen.getByText("CLOSED")).toBeTruthy()
    expect(sw.getAttribute("aria-checked")).toBe("true")
    expect(document.querySelector(".board-breaker-rocker-on")).not.toBeNull()
  })

  it("toggles on click, Space and Enter without a cover, and ignores other keys", () => {
    const { onToggle, sw } = renderBreaker()
    fireEvent.click(sw)
    fireEvent.keyDown(sw, { key: " " })
    fireEvent.keyDown(sw, { key: "Enter" })
    fireEvent.keyDown(sw, { key: "ArrowRight" })
    expect(onToggle).toHaveBeenCalledTimes(3)
  })

  it("refuses with the cover up, dims the flag and shows the reason", () => {
    const { onToggle, sw } = renderBreaker({ disabled: true, title: "Not in sync", lifted: true })
    fireEvent.click(sw)
    expect(onToggle).not.toHaveBeenCalled()
    expect(sw.getAttribute("aria-disabled")).toBe("true")
    expect(sw.getAttribute("title")).toBe("Not in sync")
    expect(document.querySelector(".board-breaker-flag-refused")).not.toBeNull()
  })

  it("blocks the handle under a cover that is down, and a click or Enter lifts the cover", () => {
    const { onToggle, onToggleCover, sw } = renderBreaker({ lifted: false })
    expect(sw.getAttribute("aria-label")).toBe("Test breaker, cover down")
    expect(document.querySelector(".board-breaker-cover")).not.toBeNull()
    expect(document.querySelector(".board-breaker-cover-lifted")).toBeNull()
    fireEvent.click(sw)
    fireEvent.keyDown(sw, { key: "Enter" })
    expect(onToggle).not.toHaveBeenCalled()
    expect(onToggleCover).toHaveBeenCalledTimes(2)
  })

  it("lets the cover lift over a refused breaker", () => {
    const { onToggle, onToggleCover, sw } = renderBreaker({ lifted: false, disabled: true })
    fireEvent.click(sw)
    expect(onToggleCover).toHaveBeenCalledTimes(1)
    expect(onToggle).not.toHaveBeenCalled()
  })

  it("rocks with the cover up, and a click on the lifted cover or Escape lowers it", () => {
    const { onToggle, onToggleCover, sw } = renderBreaker({ lifted: true })
    expect(sw.getAttribute("aria-label")).toBe("Test breaker, cover up")
    fireEvent.click(sw)
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(document.querySelector(".board-breaker-cover")).toBeNull()
    const lid: Element | null = document.querySelector(".board-breaker-cover-lifted")
    expect(lid).not.toBeNull()
    if (lid !== null) fireEvent.click(lid)
    expect(onToggleCover).toHaveBeenCalledTimes(1)
    expect(onToggle).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(sw, { key: "Escape" })
    expect(onToggleCover).toHaveBeenCalledTimes(2)
  })
})
