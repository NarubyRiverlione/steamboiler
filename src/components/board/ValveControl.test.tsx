import { act, fireEvent, render, screen } from "@testing-library/react"
import { useEffect, useState, type ReactElement } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ValveControl } from "./ValveControl"
import { ValveRampProvider, type ValveHandle } from "./ValveRampProvider"
import { RAMP_TICK_MS } from "./valveRamp"

// A plant stand-in: positions move by the dispatched delta, optionally refused, and the governor can move one
type Positions = Readonly<Record<string, number>>
let setPlant: (valve: string, position: number) => void = () => undefined
const dispatched: number[] = []

function Plant({
  start = 0,
  refuse = false,
  page = true,
  both = false,
}: {
  readonly start?: number
  readonly refuse?: boolean
  readonly page?: boolean
  readonly both?: boolean
}) {
  const [positions, setPositions] = useState<Positions>({ V: start, W: 0 })
  useEffect(() => {
    setPlant = (valve: string, position: number): void => {
      setPositions((p: Positions) => ({ ...p, [valve]: position }))
    }
  }, [])
  const handle = (valve: string): ValveHandle => ({
    actual: positions[valve],
    adjust: (delta: number): void => {
      dispatched.push(delta)
      if (!refuse)
        setPositions((p: Positions) => ({ ...p, [valve]: Math.max(0, Math.min(1, p[valve] + delta)) }))
    },
  })
  return (
    <ValveRampProvider valves={{ V: handle("V"), W: handle("W") }}>
      {page && <ValveControl ValveId="V" Label="V" Position={positions.V} Step={5} />}
      {page && both && <ValveControl ValveId="W" Label="W" Position={positions.W} Step={5} />}
    </ValveRampProvider>
  )
}

const renderValve = (ui: ReactElement) => render(<ValveRampProvider valves={{}}>{ui}</ValveRampProvider>)
const Harness = Plant

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
  it("marks a pump knob so it reads apart from a valve knob", () => {
    const { unmount } = renderValve(<ValveControl ValveId="V" Label="P" Position={0} Step={5} Pump />)
    expect(screen.getByRole("slider", { name: "P knob" }).classList.contains("board-knob-pump")).toBe(true)
    unmount()
    renderValve(<ValveControl ValveId="V" Label="V" Position={0} Step={5} />)
    expect(screen.getByRole("slider", { name: "V knob" }).classList.contains("board-knob-pump")).toBe(false)
  })

  it("shows only the flow when there is one: no position LCD, the position is on the knob", () => {
    renderValve(<ValveControl ValveId="V" Label="P" Value="5.0 l/s" Position={0.5} Step={5} />)
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
    const { rerender } = renderValve(<ValveControl ValveId="V" Label="V" Position={0} Step={5} />)
    expect(screen.queryByLabelText("V flow")).toBeNull()
    rerender(
      <ValveRampProvider valves={{}}>
        <ValveControl ValveId="V" Label="V" Value="3.0 kg/s" Position={0} Step={5} />
      </ValveRampProvider>,
    )
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

  it("changes the command by Step with Up, Down and the wheel, and ignores Left and Right", () => {
    render(<Harness start={0.5} />)
    fireEvent.keyDown(knob(), { key: "ArrowUp" })
    expect(knob().getAttribute("aria-valuenow")).toBe("55")
    fireEvent.keyDown(knob(), { key: "ArrowRight" })
    fireEvent.keyDown(knob(), { key: "ArrowLeft" })
    expect(knob().getAttribute("aria-valuenow")).toBe("55")
    fireEvent.keyDown(knob(), { key: "ArrowDown" })
    fireEvent.keyDown(knob(), { key: "ArrowDown" })
    expect(knob().getAttribute("aria-valuenow")).toBe("45")
    fireEvent.wheel(knob(), { deltaY: -100 })
    expect(knob().getAttribute("aria-valuenow")).toBe("50")
  })

  it("takes one wheel step per 50 ms, so a trackpad swipe turns the knob slowly", () => {
    vi.useFakeTimers()
    vi.setSystemTime(10_000)
    render(<Harness start={0.5} />)
    fireEvent.wheel(knob(), { deltaY: -100 })
    fireEvent.wheel(knob(), { deltaY: -100 })
    fireEvent.wheel(knob(), { deltaY: -100 })
    expect(knob().getAttribute("aria-valuenow")).toBe("55")
    vi.setSystemTime(10_060)
    fireEvent.wheel(knob(), { deltaY: -100 })
    expect(knob().getAttribute("aria-valuenow")).toBe("60")
    vi.useRealTimers()
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

  it("keeps ramping to the command after the page is unmounted", () => {
    const { rerender } = render(<Plant start={0} />)
    fireEvent.keyDown(knob(), { key: "End" })
    advance(1500)
    rerender(<Plant start={0} page={false} />)
    advance(15_000)
    rerender(<Plant start={0} />)
    expect(lcd()).toBe("100 % Open")
  })

  it("shows the reached position and the command marker when the page is mounted again mid-ramp", () => {
    const { rerender } = render(<Plant start={0} />)
    fireEvent.keyDown(knob(), { key: "End" })
    advance(1500)
    rerender(<Plant start={0} page={false} />)
    advance(6000)
    rerender(<Plant start={0} />)
    expect(lcd()).toBe("50 % Open")
    expect(knob().getAttribute("aria-valuenow")).toBe("100")
    advance(7500 + RAMP_TICK_MS)
    expect(lcd()).toBe("100 % Open")
  })

  it("ramps two valves at once without interference", () => {
    render(<Plant both />)
    fireEvent.keyDown(knob(), { key: "End" })
    fireEvent.keyDown(screen.getByRole("slider", { name: "W knob" }), { key: "Home" })
    fireEvent.keyDown(screen.getByRole("slider", { name: "W knob" }), { key: "ArrowUp" })
    advance(7500)
    expect(lcd()).toBe("50 % Open")
    expect(screen.getByLabelText("W position").textContent).toBe("5 % Open")
    advance(7500)
    expect(lcd()).toBe("100 % Open")
  })

  it("still drops the command when the governor moves the valve while the page is unmounted", () => {
    const { rerender } = render(<Plant start={0.5} />)
    fireEvent.keyDown(knob(), { key: "End" })
    advance(1000)
    rerender(<Plant start={0.5} page={false} />)
    act(() => {
      setPlant("V", 0.3)
    })
    advance(RAMP_TICK_MS * 4)
    const count: number = dispatched.length
    advance(5000)
    expect(dispatched.length).toBe(count)
    rerender(<Plant start={0.5} />)
    expect(knob().getAttribute("aria-valuenow")).toBe("30")
  })

  it("still drops the command when the plant refuses the move while the page is unmounted", () => {
    const { rerender } = render(<Plant start={0.5} refuse />)
    fireEvent.keyDown(knob(), { key: "End" })
    rerender(<Plant start={0.5} refuse page={false} />)
    advance(1000)
    const count: number = dispatched.length
    advance(2000)
    expect(dispatched.length).toBe(count)
    rerender(<Plant start={0.5} refuse />)
    expect(knob().getAttribute("aria-valuenow")).toBe("50")
  })

  it("needs a ValveRampProvider", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined)
    expect(() => render(<ValveControl ValveId="V" Label="V" Position={0} Step={5} />)).toThrow(
      "ValveRampProvider",
    )
    quiet.mockRestore()
  })

  it("follows the governor and drops an old ramp when the plant moves the valve", () => {
    render(<Harness start={0.5} />)
    fireEvent.keyDown(knob(), { key: "End" })
    advance(1000)
    act(() => {
      setPlant("V", 0.3)
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
      setPlant("V", 0.2)
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
