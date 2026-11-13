import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { LevelInstrument } from "./LevelInstrument"
import { levelZones } from "./levelZones"

describe("LevelInstrument", () => {
  it("shows the gauge, the fraction and the signed change", () => {
    render(<LevelInstrument label="Tank level" fraction={0.256} change={1.26} />)
    expect(screen.getByRole("meter", { name: "Tank level gauge" }).getAttribute("aria-valuenow")).toBe("25.6")
    expect(screen.getByLabelText("Tank level").textContent).toBe("0.26")
    expect(screen.getByLabelText("Tank level change").textContent).toBe("+1.3 kg/s")
  })

  it("draws the target line at its level, and none without a target", () => {
    const { rerender } = render(<LevelInstrument label="Tank level" fraction={0.5} change={0} />)
    expect(screen.queryByTestId("level-target")).toBeNull()
    rerender(<LevelInstrument label="Tank level" fraction={0.5} change={0} target={0.7} />)
    const line: HTMLElement = screen.getByTestId("level-target")
    expect(line.getAttribute("y1")).toBe(String(176 - (162 * 70) / 100))
  })

  it("draws the zones it is given on the gauge", () => {
    const zones = levelZones({ trip: { low: 0.1 }, alarm: { low: 0.25 }, working: { low: 0.55, high: 0.75 } })
    const { container } = render(<LevelInstrument label="Tank level" fraction={0.5} change={0} zones={zones} />)
    const tones: (string | null)[] = Array.from(container.querySelectorAll(".board-zone-bar")).map((e: Element) => e.getAttribute("data-tone"))
    expect(tones).toEqual(["alarm", "warn", "ok"])
  })

  it("shows a minus sign for a falling level", () => {
    render(<LevelInstrument label="Tank level" fraction={0.5} change={-2.54} />)
    expect(screen.getByLabelText("Tank level change").textContent).toBe("-2.5 kg/s")
  })
})
