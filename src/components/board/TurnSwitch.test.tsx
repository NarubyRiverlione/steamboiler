import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { TurnSwitch } from "./TurnSwitch"
import { tickAt } from "./switchGeometry"

type RenderOptions = {
  readonly on?: boolean
  readonly disabled?: boolean
  readonly title?: string
  readonly lifted?: boolean
}

function renderSwitch(options: RenderOptions = {}) {
  const onToggle = vi.fn()
  const onToggleCover = vi.fn()
  render(
    <TurnSwitch
      label="Vent"
      offLabel="CLOSED"
      onLabel="OPEN"
      on={options.on ?? false}
      onToggle={onToggle}
      disabled={options.disabled}
      title={options.title}
      guard={options.lifted === undefined ? undefined : { lifted: options.lifted, onToggleCover }}
    />,
  )
  return { onToggle, onToggleCover, sw: screen.getByRole("switch") }
}

const litPlates = (): string[] =>
  Array.from(document.querySelectorAll("[data-lit='true']")).map((g: Element) => g.textContent ?? "")

describe("TurnSwitch", () => {
  it("never changes its legends and lights the plate of the selected position", () => {
    renderSwitch({ on: false })
    expect(litPlates()).toEqual(["CLOSED"])
    expect(screen.getByText("OPEN")).toBeTruthy()
  })

  it("lights the on plate and reports checked while on", () => {
    const { sw } = renderSwitch({ on: true })
    expect(litPlates()).toEqual(["OPEN"])
    expect(sw.getAttribute("aria-checked")).toBe("true")
  })

  it("toggles on click, Space and Enter", () => {
    const { onToggle, sw } = renderSwitch()
    fireEvent.click(sw)
    fireEvent.keyDown(sw, { key: " " })
    fireEvent.keyDown(sw, { key: "Enter" })
    expect(onToggle).toHaveBeenCalledTimes(3)
  })

  it("ignores other keys, so the arrows still change the page", () => {
    const { onToggle, sw } = renderSwitch()
    fireEvent.keyDown(sw, { key: "ArrowRight" })
    fireEvent.keyDown(sw, { key: "Escape" })
    expect(onToggle).not.toHaveBeenCalled()
  })

  it("refuses while disabled and shows the reason", () => {
    const { onToggle, sw } = renderSwitch({ disabled: true, title: "Not in sync" })
    fireEvent.click(sw)
    expect(onToggle).not.toHaveBeenCalled()
    expect(sw.getAttribute("aria-disabled")).toBe("true")
    expect(screen.getByText("Not in sync").tagName.toLowerCase()).toBe("title")
  })

  it("blocks the switch under a cover that is down, and a click lifts the cover", () => {
    const { onToggle, onToggleCover, sw } = renderSwitch({ lifted: false })
    expect(sw.getAttribute("aria-label")).toBe("Vent, cover down")
    expect(screen.getByText("LIFT COVER")).toBeTruthy()
    fireEvent.click(sw)
    expect(onToggle).not.toHaveBeenCalled()
    expect(onToggleCover).toHaveBeenCalledTimes(1)
  })

  it("lifts the cover from the keyboard", () => {
    const { onToggle, onToggleCover, sw } = renderSwitch({ lifted: false })
    fireEvent.keyDown(sw, { key: "Enter" })
    expect(onToggle).not.toHaveBeenCalled()
    expect(onToggleCover).toHaveBeenCalledTimes(1)
  })

  it("does not lift a cover over a disabled switch", () => {
    const { onToggleCover, sw } = renderSwitch({ lifted: false, disabled: true })
    fireEvent.click(sw)
    expect(onToggleCover).not.toHaveBeenCalled()
  })

  it("turns with the cover up, and the cover strip or Escape puts it down", () => {
    const { onToggle, onToggleCover, sw } = renderSwitch({ lifted: true })
    expect(sw.getAttribute("aria-label")).toBe("Vent, cover up")
    fireEvent.click(sw)
    expect(onToggle).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText("COVER UP"))
    expect(onToggleCover).toHaveBeenCalledTimes(1)
    expect(onToggle).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(sw, { key: "Escape" })
    expect(onToggleCover).toHaveBeenCalledTimes(2)
  })
})

describe("tickAt", () => {
  it("draws vertical at 0 degrees and to the right at 90", () => {
    const up = tickAt(0, 10, 20)
    expect(up.x1).toBeCloseTo(0)
    expect(up.y1).toBeCloseTo(-10)
    expect(up.x2).toBeCloseTo(0)
    expect(up.y2).toBeCloseTo(-20)
    const right = tickAt(90, 10, 20)
    expect(right.x1).toBeCloseTo(10)
    expect(right.y1).toBeCloseTo(0)
    expect(right.x2).toBeCloseTo(20)
    expect(right.y2).toBeCloseTo(0)
  })
})
