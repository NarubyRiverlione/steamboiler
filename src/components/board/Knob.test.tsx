import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Knob } from "./Knob"
import { knobValueFromPointer } from "./knobTravel"

const DEAD_ZONE = 0.05

function renderRateKnob(value: number, onChange: (value: number) => void = vi.fn()) {
  render(<Knob mode="centre-zero" label="Gas knob" value={value} deadZone={DEAD_ZONE} onChange={onChange} />)
  return screen.getByRole("slider", { name: "Gas knob" })
}

describe("Knob centre-zero", () => {
  it("is a slider from -1 to 1 with the command as its value", () => {
    const knob: HTMLElement = renderRateKnob(0.4)
    expect(knob.getAttribute("aria-valuemin")).toBe("-1")
    expect(knob.getAttribute("aria-valuemax")).toBe("1")
    expect(knob.getAttribute("aria-valuenow")).toBe("0.4")
  })

  it("says in words whether it raises, lowers or holds", () => {
    const { unmount } = render(
      <Knob mode="centre-zero" label="K" value={0.4} deadZone={DEAD_ZONE} onChange={vi.fn()} />,
    )
    expect(screen.getByRole("slider").getAttribute("aria-valuetext")).toBe("Raising")
    unmount()
    const { unmount: second } = render(
      <Knob mode="centre-zero" label="K" value={-0.4} deadZone={DEAD_ZONE} onChange={vi.fn()} />,
    )
    expect(screen.getByRole("slider").getAttribute("aria-valuetext")).toBe("Lowering")
    second()
    render(<Knob mode="centre-zero" label="K" value={0.03} deadZone={DEAD_ZONE} onChange={vi.fn()} />)
    expect(screen.getByRole("slider").getAttribute("aria-valuetext")).toBe("Holding")
  })

  it("labels the ends LOWER and RAISE and the centre HOLD", () => {
    renderRateKnob(0)
    expect(screen.getByText("LOWER ▼")).toBeTruthy()
    expect(screen.getByText("▲ RAISE")).toBeTruthy()
    expect(screen.getByText("HOLD")).toBeTruthy()
  })

  it("lights the centre detent only while the rate is zero", () => {
    const { container, rerender } = render(
      <Knob mode="centre-zero" label="K" value={0.03} deadZone={DEAD_ZONE} onChange={vi.fn()} />,
    )
    expect(container.querySelector(".board-detent-lit")).not.toBeNull()
    rerender(<Knob mode="centre-zero" label="K" value={0.5} deadZone={DEAD_ZONE} onChange={vi.fn()} />)
    expect(container.querySelector(".board-detent-lit")).toBeNull()
    expect(container.querySelector(".board-detent")).not.toBeNull()
  })

  it("draws the bipolar arc only off-centre and the cap tint that sets it apart from a valve knob", () => {
    const { container, rerender } = render(
      <Knob mode="centre-zero" label="K" value={0} deadZone={DEAD_ZONE} onChange={vi.fn()} />,
    )
    expect(container.querySelector(".board-knob-arc")).toBeNull()
    expect(container.querySelector(".board-knob-cap-rate")).not.toBeNull()
    rerender(<Knob mode="centre-zero" label="K" value={-0.7} deadZone={DEAD_ZONE} onChange={vi.fn()} />)
    expect(container.querySelector(".board-knob-arc")).not.toBeNull()
  })

  it("turns with the arrow keys and centres with Home", () => {
    const onChange = vi.fn()
    const knob: HTMLElement = renderRateKnob(0.2, onChange)
    fireEvent.keyDown(knob, { key: "ArrowRight" })
    fireEvent.keyDown(knob, { key: "ArrowUp" })
    fireEvent.keyDown(knob, { key: "ArrowLeft" })
    fireEvent.keyDown(knob, { key: "ArrowDown" })
    fireEvent.keyDown(knob, { key: "Home" })
    fireEvent.keyDown(knob, { key: "a" })
    expect(onChange.mock.calls).toEqual([[0.3], [0.3], [0.1], [0.1], [0]])
  })

  it("stops at the ends of the travel", () => {
    const onChange = vi.fn()
    fireEvent.keyDown(renderRateKnob(0.95, onChange), { key: "ArrowRight" })
    expect(onChange).toHaveBeenCalledWith(1)
  })

  it("turns with the scroll wheel, up raising", () => {
    const onChange = vi.fn()
    const knob: HTMLElement = renderRateKnob(0, onChange)
    fireEvent.wheel(knob, { deltaY: -100 })
    fireEvent.wheel(knob, { deltaY: 100 })
    expect(onChange.mock.calls).toEqual([[0.1], [-0.1]])
  })

  it("follows a mouse drag around the knob and stays where it is let go", () => {
    const onChange = vi.fn()
    const knob: HTMLElement = renderRateKnob(0, onChange)
    knob.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect
    knob.setPointerCapture = vi.fn()
    fireEvent.pointerMove(knob, { clientX: 100, clientY: 50 })
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.pointerDown(knob, { clientX: 100, clientY: 50, pointerId: 1 })
    fireEvent.pointerMove(knob, { clientX: 50, clientY: 0 })
    fireEvent.pointerUp(knob, { pointerId: 1 })
    fireEvent.pointerMove(knob, { clientX: 0, clientY: 50 })
    expect(onChange.mock.calls).toEqual([[0.67], [0]])
  })
})

describe("knobValueFromPointer", () => {
  it("is 0 straight up, positive to the right and negative to the left", () => {
    expect(knobValueFromPointer(0, -10)).toBe(0)
    expect(knobValueFromPointer(10, -10)).toBeCloseTo(0.33, 2)
    expect(knobValueFromPointer(-10, -10)).toBeCloseTo(-0.33, 2)
  })

  it("stops at the ends of the sweep, below the centre included", () => {
    expect(knobValueFromPointer(10, 0)).toBe(0.67)
    expect(knobValueFromPointer(10, 10)).toBe(1)
    expect(knobValueFromPointer(-10, 10)).toBe(-1)
    expect(knobValueFromPointer(0, 10)).toBe(1)
  })
})
