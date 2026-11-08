import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { LensButton } from "./LensButton"

describe("LensButton", () => {
  it("keeps the width of its widest label, whatever it shows now", () => {
    render(
      <LensButton onClick={() => undefined} widest="Closed">
        Open
      </LensButton>,
    )
    const button: HTMLElement = screen.getByRole("button", { name: "Open" })
    expect(button.classList.contains("board-lens-fixed")).toBe(true)
    expect(button.style.getPropertyValue("--board-lens-chars")).toBe("6")
  })

  it("sizes to its label when no widest label is given", () => {
    render(<LensButton onClick={() => undefined}>Open</LensButton>)
    expect(screen.getByRole("button", { name: "Open" }).classList.contains("board-lens-fixed")).toBe(false)
  })
})
