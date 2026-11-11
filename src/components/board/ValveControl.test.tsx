import { act, fireEvent, render, screen } from "@testing-library/react"
import { useEffect, useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ValveControl } from "./ValveControl"
import { RAMP_TICK_MS } from "./valveRamp"

// A plant stand-in: the position moves by the dispatched delta, optionally refused, and the governor can move it
let setPlant: (position: number) => void = () => undefined
const dispatched: number[] = []

function Harness({ start = 0, refuse = false }: { readonly start?: number; readonly refuse?: boolean }) {
  const [position, setPosition] = useState<number>(start)
  useEffect(() => {
    setPlant = setPosition
  }, [])
  return (
    <ValveControl
      Label="V"
      Position={position}
      Step={5}
      cbAdjust={(delta: number) => {
        dispatched.push(delta)
        if (!refuse) setPosition((p: number) => Math.max(0, Math.min(1, p + delta)))
      }}
    />
  )
}

const knob = (): HTMLElement => screen.getByRole("slider", { name: "V knob" })
const lcd = (): string | null => screen.getByLabelText("V position").textContent
// One act per tick, as the browser renders between ticks
const advance = (ms: number): void => {
  for (let elapsed = 0; elapsed < ms; elapsed += RAMP_TICK_MS) {
    act(() => {
      vi.advanceTimersByTime(RAMP_TICK_MS)
    })
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  dispatched.length = 0
})
afterEach(() => {
  vi.useRealTimers()
})

describe("ValveControl", () => {
  it("shows only the flow when there is one: no position LCD, the position is on the knob", () => {
    render(<ValveControl Label="P" Value="5.0 l/s" Position={0.5} Step={5} cbAdjust={vi.fn()} />)
    expect(screen.getByLabelText("P flow").textContent).toBe("5.0 l/s")
    expect(screen.queryByLabelText("P position")).toBeNull()
    expect(screen.getByRole("slider", { name: "P knob" }).getAttribute("aria-valuenow")).toBe("50")
  })

  it("is a named slider with the position as value, no Close and Open buttons and no bar", () => {
    render(<Harness start={0.25} />)
    expect(knob().getAttribute("aria-valuenow")).toBe("25")
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.queryByRole("meter")).toBeNull()
    expect(lcd()).toBe("25 % Open")
  })

  it("shows the flow only when given", () => {
    const { rerender } = render(<ValveControl Label="V" Position={0} Step={5} cbAdjust={vi.fn()} />)
    expect(screen.queryByLabelText("V flow")).toBeNull()
    rerender(<ValveControl Label="V" Value="3.0 kg/s" Position={0} Step={5} cbAdjust={vi.fn()} />)
    expect(screen.getByLabelText("V flow").textContent).toBe("3.0 kg/s")
  })

  it("turns right to open and left to close by drag, within 0 to 100 %", () => {
    render(<Harness start={0.5} />)
    knob().setPointerCapture = vi.fn()
    fireEvent.pointerDown(knob(), { clientX: 100, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(knob(), { clientX: 130, clientY: 0 })
    expect(knob().getAttribute("aria-valuenow")).toBe("75")
    fireEvent.pointerMove(knob(), { clientX: 900, clientY: 0 })
    expect(knob().getAttribute("aria-valuenow")).toBe("100")
    fireEvent.pointerMove(knob(), { clientX: 70, clientY: 0 })
    expect(knob().getAttribute("aria-valuenow")).toBe("25")
    fireEvent.pointerMove(knob(), { clientX: -900, clientY: 0 })
    expect(knob().getAttribute("aria-valuenow")).toBe("0")
  })

  it("changes the command by Step with arrow keys and wheel", () => {
    render(<Harness start={0.5} />)
    fireEvent.keyDown(knob(), { key: "ArrowRight" })
    expect(knob().getAttribute("aria-valuenow")).toBe("55")
    fireEvent.keyDown(knob(), { key: "ArrowLeft" })
    fireEvent.keyDown(knob(), { key: "ArrowLeft" })
    expect(knob().getAttribute("aria-valuenow")).toBe("45")
    fireEvent.wheel(knob(), { deltaY: -100 })
    expect(knob().getAttribute("aria-valuenow")).toBe("50")
  })

  it("ramps the actual position toward the command at 100 % per 15 real seconds", () => {
    render(<Harness start={0} />)
    fireEvent.keyDown(knob(), { key: "End" })
    expect(lcd()).toBe("0 % Open")
    advance(7500)
    expect(lcd()).toBe("50 % Open")
    expect(knob().getAttribute("aria-valuenow")).toBe("100")
    advance(7500 + RAMP_TICK_MS)
    expect(lcd()).toBe("100 % Open")
    const count: number = dispatched.length
    advance(1000)
    expect(dispatched.length).toBe(count)
  })

  it("retargets a ramp that is running", () => {
    render(<Harness start={0} />)
    fireEvent.keyDown(knob(), { key: "End" })
    advance(7500)
    fireEvent.keyDown(knob(), { key: "Home" })
    advance(3000)
    expect(lcd()).toBe("30 % Open")
    advance(6000)
    expect(lcd()).toBe("0 % Open")
  })

  it("shows the actual position on a second pointer while the cap shows the command", () => {
    render(<Harness start={0} />)
    const before: string | null = screen.getByTestId("knob-actual").getAttribute("transform")
    fireEvent.keyDown(knob(), { key: "End" })
    advance(7500)
    expect(screen.getByTestId("knob-actual").getAttribute("transform")).not.toBe(before)
    expect(knob().getAttribute("aria-valuenow")).toBe("100")
  })

  it("stops the ramp on unmount", () => {
    const { unmount } = render(<Harness start={0} />)
    fireEvent.keyDown(knob(), { key: "End" })
    advance(500)
    unmount()
    const count: number = dispatched.length
    advance(5000)
    expect(dispatched.length).toBe(count)
  })

  it("follows the governor and drops an old ramp when the plant moves the valve", () => {
    render(<Harness start={0.5} />)
    fireEvent.keyDown(knob(), { key: "End" })
    advance(1000)
    act(() => {
      setPlant(0.3)
    })
    advance(RAMP_TICK_MS * 2)
    expect(knob().getAttribute("aria-valuenow")).toBe("30")
    const count: number = dispatched.length
    advance(5000)
    expect(dispatched.length).toBe(count)
    expect(lcd()).toBe("30 % Open")
  })

  it("follows the governor when no ramp runs", () => {
    render(<Harness start={0.5} />)
    act(() => {
      setPlant(0.2)
    })
    expect(knob().getAttribute("aria-valuenow")).toBe("20")
  })

  it("drops the command when the plant refuses the move", () => {
    render(<Harness start={0.5} refuse />)
    fireEvent.keyDown(knob(), { key: "End" })
    advance(1000)
    expect(knob().getAttribute("aria-valuenow")).toBe("50")
    const count: number = dispatched.length
    advance(2000)
    expect(dispatched.length).toBe(count)
  })
})
