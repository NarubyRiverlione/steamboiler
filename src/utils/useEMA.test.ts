// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import useEMA, { smoothingAlpha } from "./useEMA"

describe("smoothingAlpha", () => {
  it("is 0 when no time has passed", () => {
    expect(smoothingAlpha(0, 2)).toBe(0)
  })

  it("is about 0.632 after one time constant", () => {
    expect(smoothingAlpha(2, 2)).toBeCloseTo(0.632, 3)
  })

  it("approaches 1 for a long gap", () => {
    expect(smoothingAlpha(100, 2)).toBeGreaterThan(0.999)
  })

  it("grows with the elapsed time", () => {
    expect(smoothingAlpha(0.5, 2)).toBeLessThan(smoothingAlpha(1, 2))
    expect(smoothingAlpha(1, 2)).toBeLessThan(smoothingAlpha(3, 2))
  })
})

describe("useEMA", () => {
  afterEach(cleanup)

  function setup(initial: number, tau: number) {
    let nowMs = 0
    const clock = (): number => nowMs
    const hook = renderHook(({ value }: { value: number }) => useEMA(value, tau, clock), {
      initialProps: { value: initial },
    })
    return {
      hook,
      advance: (ms: number): void => {
        nowMs += ms
      },
      set: (value: number): void => {
        act(() => { hook.rerender({ value }); })
      },
    }
  }

  it("starts at the first value", () => {
    const { hook } = setup(10, 2)
    expect(hook.result.current).toBe(10)
  })

  it("moves 63% of the way to a new value after one time constant", () => {
    const t = setup(0, 2)
    t.advance(2000)
    t.set(100)
    expect(t.hook.result.current).toBeCloseTo(63.2, 1)
  })

  it("gives the same lag for the same elapsed time at a different step cadence", () => {
    const coarse = setup(0, 2)
    coarse.advance(2000)
    coarse.set(100)

    const fine = setup(0, 2)
    for (let i = 1; i <= 20; i++) {
      fine.advance(100)
      // a negligible nudge makes the value change, so every render takes a step toward ~100
      fine.set(100 + i * 1e-9)
    }
    expect(fine.hook.result.current).toBeCloseTo(coarse.hook.result.current, 4)
  })

  it("does not step while the value is unchanged", () => {
    const t = setup(0, 2)
    t.advance(1000)
    t.set(100)
    const after: number = t.hook.result.current
    t.advance(5000)
    t.set(100)
    expect(t.hook.result.current).toBe(after)
  })

  it("caps a long gap at five time constants", () => {
    const t = setup(0, 2)
    t.advance(3_600_000)
    t.set(100)
    // capped dt = 10 s: 100 * (1 - exp(-5)); without the cap it would be 100
    expect(t.hook.result.current).toBeCloseTo(99.326, 2)
  })

  it("treats a clock that went backwards as no elapsed time", () => {
    const t = setup(0, 2)
    t.advance(-1000)
    t.set(100)
    expect(t.hook.result.current).toBe(0)
  })
})
