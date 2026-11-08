import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ValveControl } from "./ValveControl"

describe("ValveControl", () => {
  it("shows the position on an LCD and the bar", () => {
    render(<ValveControl Label="Bypass Valve" Position={0.25} Step={5} cbAdjust={vi.fn()} />)
    expect(screen.getByLabelText("Bypass Valve position").textContent).toBe("25 % Open")
    expect(screen.getByRole("meter", { name: "Bypass Valve bar" }).getAttribute("aria-valuenow")).toBe("25")
  })

  it("shows the flow only when given", () => {
    const { rerender } = render(<ValveControl Label="V" Position={0} Step={5} cbAdjust={vi.fn()} />)
    expect(screen.queryByLabelText("V flow")).toBeNull()
    rerender(<ValveControl Label="V" Value="3.0 kg/s" Position={0} Step={5} cbAdjust={vi.fn()} />)
    expect(screen.getByLabelText("V flow").textContent).toBe("3.0 kg/s")
  })

  it("calls cbAdjust with the step as a fraction: negative for Close, positive for Open", () => {
    const cb = vi.fn()
    render(<ValveControl Label="V" Position={0.5} Step={5} cbAdjust={cb} />)
    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    fireEvent.click(screen.getByRole("button", { name: "Open" }))
    expect(cb).toHaveBeenNthCalledWith(1, -0.05)
    expect(cb).toHaveBeenNthCalledWith(2, 0.05)
  })
})
