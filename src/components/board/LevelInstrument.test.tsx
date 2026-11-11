import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { LevelInstrument } from "./LevelInstrument"

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

  it("shows a minus sign for a falling level", () => {
    render(<LevelInstrument label="Tank level" fraction={0.5} change={-2.54} />)
    expect(screen.getByLabelText("Tank level change").textContent).toBe("-2.5 kg/s")
  })
})
