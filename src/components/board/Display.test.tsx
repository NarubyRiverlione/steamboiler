import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Display } from "./Display"

describe("Display", () => {
  it("shows its text under its label", () => {
    render(<Display label="Pressure" text="12.5" />)
    expect(screen.getByLabelText("Pressure").textContent).toBe("12.5")
  })

  it("lights red only while the value is in alarm", () => {
    const { rerender } = render(<Display label="Pressure" text="12.5" />)
    expect(screen.getByLabelText("Pressure").classList.contains("board-display-alarm")).toBe(false)
    rerender(<Display label="Pressure" text="12.5" alarm />)
    expect(screen.getByLabelText("Pressure").classList.contains("board-display-alarm")).toBe(true)
  })
})
