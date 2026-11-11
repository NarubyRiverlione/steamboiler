import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Knob } from "./Knob"
import { knobValueFromDrag, PUMP_DRAG_FULL_SWEEP_PX } from "./knobTravel"

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

  it("moves with horizontal drag only, right raising and left lowering, and stays where it is let go", () => {
    const onChange = vi.fn()
    const knob: HTMLElement = renderRateKnob(0.2, onChange)
    knob.setPointerCapture = vi.fn()
    fireEvent.pointerMove(knob, { clientX: 500, clientY: 50 })
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.pointerDown(knob, { clientX: 100, clientY: 50, pointerId: 1 })
    fireEvent.pointerMove(knob, { clientX: 130, clientY: 50 })
    fireEvent.pointerMove(knob, { clientX: 70, clientY: 50 })
    fireEvent.pointerUp(knob, { pointerId: 1 })
    fireEvent.pointerMove(knob, { clientX: 0, clientY: 50 })
    expect(onChange.mock.calls).toEqual([[0.7], [-0.3]])
  })

  it("ignores vertical drag and clamps at the ends", () => {
    const onChange = vi.fn()
    const knob: HTMLElement = renderRateKnob(0.9, onChange)
    knob.setPointerCapture = vi.fn()
    fireEvent.pointerDown(knob, { clientX: 100, clientY: 50, pointerId: 1 })
    fireEvent.pointerMove(knob, { clientX: 100, clientY: -300 })
    fireEvent.pointerMove(knob, { clientX: 100, clientY: 400 })
    expect(onChange.mock.calls).toEqual([[0.9], [0.9]])
    fireEvent.pointerMove(knob, { clientX: 400, clientY: 50 })
    fireEvent.pointerMove(knob, { clientX: -400, clientY: 50 })
    expect(onChange.mock.calls.slice(2)).toEqual([[1], [-1]])
  })
})

describe("knobValueFromDrag", () => {
  it("adds the horizontal travel over the full-sweep width to the starting value", () => {
    expect(knobValueFromDrag(0, 0)).toBe(0)
    expect(knobValueFromDrag(0, 30)).toBe(0.5)
    expect(knobValueFromDrag(0.5, -30)).toBe(0)
  })

  it("takes a longer drag for the same change on a pump knob", () => {
    expect(knobValueFromDrag(0, 90, PUMP_DRAG_FULL_SWEEP_PX)).toBe(0.5)
    expect(knobValueFromDrag(0, 30, PUMP_DRAG_FULL_SWEEP_PX)).toBe(0.17)
  })

  it("stops at the ends of the travel", () => {
    expect(knobValueFromDrag(0.5, 500)).toBe(1)
    expect(knobValueFromDrag(-0.5, -500)).toBe(-1)
  })
})

describe("Knob absolute", () => {
  it("is a display-only meter without onChange", () => {
    render(<Knob label="K" value={30} min={0} max={100} ends={["0", "100"]} />)
    expect(screen.getByRole("meter", { name: "K" }).getAttribute("aria-valuenow")).toBe("30")
    expect(screen.queryByRole("slider")).toBeNull()
  })

  it("is a slider with onChange, turned by keys, wheel and drag, clamped to its ends", () => {
    const onChange = vi.fn()
    render(<Knob label="K" value={98} min={0} max={100} ends={["0", "100"]} step={5} onChange={onChange} />)
    const knob: HTMLElement = screen.getByRole("slider", { name: "K" })
    fireEvent.keyDown(knob, { key: "ArrowRight" })
    fireEvent.keyDown(knob, { key: "Home" })
    fireEvent.keyDown(knob, { key: "x" })
    fireEvent.wheel(knob, { deltaY: 100 })
    knob.setPointerCapture = vi.fn()
    fireEvent.pointerMove(knob, { clientX: 500, clientY: 0 })
    fireEvent.pointerDown(knob, { clientX: 0, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(knob, { clientX: -30, clientY: 0 })
    fireEvent.pointerUp(knob, { pointerId: 1 })
    expect(onChange.mock.calls).toEqual([[100], [0], [93], [73]])
  })

  it("turns a pump knob a third as far for the same drag", () => {
    const onChange = vi.fn()
    render(<Knob label="P" value={50} min={0} max={100} ends={["0", "100"]} onChange={onChange} tone="pump" />)
    const knob: HTMLElement = screen.getByRole("slider", { name: "P" })
    knob.setPointerCapture = vi.fn()
    fireEvent.pointerDown(knob, { clientX: 0, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(knob, { clientX: 90, clientY: 0 })
    fireEvent.pointerUp(knob, { pointerId: 1 })
    expect(onChange.mock.calls).toEqual([[75]])
  })
})
