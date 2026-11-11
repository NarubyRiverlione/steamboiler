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

  it("shows a minus sign for a falling level", () => {
    render(<LevelInstrument label="Tank level" fraction={0.5} change={-2.54} />)
    expect(screen.getByLabelText("Tank level change").textContent).toBe("-2.5 kg/s")
  })
})
