import { describe, expect, test } from "vitest"
import { CstSimulation } from "./const"
import { formatClock, simulatedSeconds, startWallClock, ticksDue } from "./Playback"

const { MaxTicksPerUpdate } = CstSimulation

describe("ticksDue", () => {
  test("1x runs 10 ticks per wall second, the rate of the original loop", () => {
    expect(ticksDue(startWallClock(0), 1000, 1, false).ticks).toBe(10)
  })

  test("10x and 60x scale the ticks per second, not DeltaTime", () => {
    expect(ticksDue(startWallClock(0), 100, 10, false).ticks).toBe(10)
    expect(ticksDue(startWallClock(0), 50, 60, false).ticks).toBe(30)
  })

  test("the fraction of a tick is carried to the next update", () => {
    const first = ticksDue(startWallClock(0), 150, 1, false)
    expect(first.ticks).toBe(1)
    expect(ticksDue(first.clock, 250, 1, false).ticks).toBe(1)
  })

  test("a speed change mid-run keeps the carry and loses no time", () => {
    const first = ticksDue(startWallClock(0), 150, 1, false) // 1 tick, half a tick carried
    expect(ticksDue(first.clock, 160, 10, false).ticks).toBe(1) // 0.5 + 1 tick
  })

  test("pause runs nothing and does not bank the time", () => {
    const paused = ticksDue(startWallClock(0), 5000, 0, false)
    expect(paused.ticks).toBe(0)
    expect(ticksDue(paused.clock, 5100, 1, false).ticks).toBe(1)
  })

  test("a hidden tab runs nothing and resumes with no catch-up", () => {
    const hidden = ticksDue(startWallClock(0), 60_000, 60, true)
    expect(hidden.ticks).toBe(0)
    expect(ticksDue(hidden.clock, 60_050, 60, false).ticks).toBe(30)
  })

  test("at the cap the plant runs slower: ticks are capped and the rest is dropped", () => {
    const capped = ticksDue(startWallClock(0), 10_000, 60, false)
    expect(capped.ticks).toBe(MaxTicksPerUpdate)
    expect(capped.clock.carry).toBe(0)
  })

  test("a clock that goes backwards gives no ticks", () => {
    expect(ticksDue(startWallClock(1000), 500, 1, false).ticks).toBe(0)
  })
})

describe("clock", () => {
  test("simulated seconds are ticks times DeltaTime", () => {
    expect(simulatedSeconds(36_000)).toBeCloseTo(3600)
  })
  test("formats as h:mm:ss", () => {
    expect(formatClock(0)).toBe("0:00:00")
    expect(formatClock(3725.9)).toBe("1:02:05")
  })
})
