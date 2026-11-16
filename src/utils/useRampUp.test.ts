// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import useRampUp from "./useRampUp"

describe("useRampUp", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  function setup(initial: number) {
    const clock = (): number => Date.now()
    return renderHook(({ value }: { value: number }) => useRampUp(value, 1, clock), { initialProps: { value: initial } })
  }

  it("shows the first value at once", () => {
    const { result } = setup(3)
    expect(result.current).toBe(3)
  })

  it("climbs to a higher value at the rate per second", () => {
    const { result, rerender } = setup(0)
    rerender({ value: 3 })
    expect(result.current).toBe(0)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current).toBeCloseTo(1, 5)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current).toBeCloseTo(2, 5)
  })

  it("stops at the value and does not overshoot", () => {
    const { result, rerender } = setup(0)
    rerender({ value: 3 })
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(result.current).toBe(3)
    expect(vi.getTimerCount()).toBe(0)
  })

  it("follows a fall at once", () => {
    const { result, rerender } = setup(3)
    rerender({ value: 0 })
    expect(result.current).toBe(0)
  })

  it("follows a fall at once while still climbing", () => {
    const { result, rerender } = setup(0)
    rerender({ value: 3 })
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    rerender({ value: 1 })
    expect(result.current).toBe(1)
  })
})
