import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { LensButton } from "./LensButton"

describe("LensButton", () => {
  it("is lit and pressed while pressed is set", () => {
    render(
      <LensButton pressed onClick={() => undefined}>
        TEST
      </LensButton>,
    )
    const button: HTMLElement = screen.getByRole("button", { name: "TEST" })
    expect(button.getAttribute("aria-pressed")).toBe("true")
    expect(button.classList.contains("board-lens-lit")).toBe(true)
  })

  it("is dark without pressed, and calls onClick", () => {
    const onClick = vi.fn()
    render(<LensButton onClick={onClick}>ACK</LensButton>)
    const button: HTMLElement = screen.getByRole("button", { name: "ACK" })
    expect(button.classList.contains("board-lens-lit")).toBe(false)
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("carries the reason of a disabled button as its title", () => {
    render(
      <LensButton disabled title="Open the main steam valve first" onClick={() => undefined}>
        Ramp up
      </LensButton>,
    )
    const button: HTMLButtonElement = screen.getByRole("button", { name: "Ramp up" })
    expect(button.disabled).toBe(true)
    expect(button.title).toBe("Open the main steam valve first")
  })
})
