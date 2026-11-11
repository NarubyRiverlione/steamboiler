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

  it("flashes only when asked to", () => {
    const { rerender } = render(<Display label="Clock" text="0:00:00" />)
    expect(screen.getByLabelText("Clock").classList.contains("board-display-flash")).toBe(false)
    rerender(<Display label="Clock" text="0:00:00" flashing />)
    expect(screen.getByLabelText("Clock").classList.contains("board-display-flash")).toBe(true)
  })

  it("keeps the width of its widest text, whatever it shows now", () => {
    render(<Display label="Position" text="0 % Open" widest="100 % Open" />)
    const lcd: HTMLElement = screen.getByLabelText("Position")
    expect(lcd.classList.contains("board-display-fixed")).toBe(true)
    expect(lcd.style.getPropertyValue("--board-display-chars")).toBe("10")
  })

  it("sizes to its text when no widest text is given", () => {
    render(<Display label="Position" text="0 % Open" />)
    expect(screen.getByLabelText("Position").classList.contains("board-display-fixed")).toBe(false)
  })
})
