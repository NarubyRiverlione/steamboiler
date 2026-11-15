/**
 * PowerPlantProvider against the real reducer (ui project, jsdom): the wall-clock simulation loop (ADR 0034) and the
 * wiring of every action creator. The tick arithmetic is in Playback.test.ts and the reducer in the reducer tests;
 * the page tests mock this provider, so a swapped action creator would pass them.
 */
import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import turbineSync from "../../sim/snapshots/turbine-sync.json"
import { CstSimulation } from "./const"
import type { PlaybackSpeed } from "./Playback"
import PowerPlantProvider from "./PowerPlantProvider"
import usePowerPlant from "./PowerPlantContext"
import { validatedState } from "./startPresets"
import type PowerPlantState from "./PowerPlantState"

type PlantContext = ReturnType<typeof usePowerPlant>

const wrapper = ({ children }: { children: ReactNode }) => <PowerPlantProvider>{children}</PowerPlantProvider>

const mount = () => renderHook(() => usePowerPlant(), { wrapper })

const loadState = (result: { current: PlantContext }, state: PowerPlantState): void => {
  act(() => {
    result.current.dispatch({ type: "LOAD_STATE", payload: { state } })
  })
}

const setHidden = (hidden: boolean): void => {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden })
  document.dispatchEvent(new Event("visibilitychange"))
}

describe("simulation loop", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "performance"] })
  })
  afterEach(() => {
    setHidden(false)
    vi.useRealTimers()
  })

  it("fakes performance.now() together with the timers", () => {
    const before: number = performance.now()
    vi.advanceTimersByTime(1000)
    expect(performance.now() - before).toBe(1000)
  })

  it("advances the simulated time when the interval fires", () => {
    const { result } = mount()
    expect(result.current.simulatedSeconds).toBe(0)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    // 1x is real time: one wall second is one simulated second
    expect(result.current.simulatedSeconds).toBeCloseTo(1, 5)
  })

  it.each([
    [10, 10],
    [60, 60],
  ] as [PlaybackSpeed, number][])("follows the playback speed %ix", (speed: PlaybackSpeed, expected: number) => {
    const { result } = mount()
    act(() => {
      result.current.setPlaybackSpeed(speed)
    })
    expect(result.current.playbackSpeed).toBe(speed)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.simulatedSeconds).toBeCloseTo(expected, 5)
  })

  it("does not restart the interval or lose time when the speed changes", () => {
    const { result } = mount()
    act(() => {
      vi.advanceTimersByTime(500)
    })
    act(() => {
      result.current.setPlaybackSpeed(10)
    })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current.simulatedSeconds).toBeCloseTo(0.5 + 5, 5)
  })

  it("stops when paused and does not catch up after resuming", () => {
    const { result } = mount()
    act(() => {
      result.current.setPlaybackSpeed(0)
    })
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current.simulatedSeconds).toBe(0)
    act(() => {
      result.current.setPlaybackSpeed(1)
    })
    act(() => {
      vi.advanceTimersByTime(CstSimulation.UpdateInterval)
    })
    expect(result.current.simulatedSeconds).toBeLessThanOrEqual((CstSimulation.UpdateInterval / 1000) * 2)
  })

  it("does not catch up the time missed while the tab was hidden", () => {
    const { result } = mount()
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    const beforeHide: number = result.current.simulatedSeconds
    expect(beforeHide).toBeGreaterThan(0)
    act(() => {
      setHidden(true)
      vi.advanceTimersByTime(10_000)
    })
    expect(result.current.simulatedSeconds).toBe(beforeHide)
    act(() => {
      setHidden(false)
      vi.advanceTimersByTime(CstSimulation.UpdateInterval)
    })
    expect(result.current.simulatedSeconds - beforeHide).toBeLessThanOrEqual((CstSimulation.UpdateInterval / 1000) * 2)
  })

  it("restarts the wall clock on a visibility change, even when the interval was throttled", () => {
    // wall time jumps without the interval firing, as in a throttled background tab
    let wallMs = 0
    const now = vi.spyOn(performance, "now").mockImplementation(() => wallMs)
    const { result } = mount()
    wallMs = 60_000
    document.dispatchEvent(new Event("visibilitychange"))
    wallMs += CstSimulation.UpdateInterval
    act(() => {
      vi.advanceTimersByTime(CstSimulation.UpdateInterval)
    })
    // without the restart the 60 s gap would run as the capped burst of ticks
    expect(result.current.simulatedSeconds).toBeLessThan(1)
    now.mockRestore()
  })

  it("clears the interval and the listener on unmount", () => {
    const removeListener = vi.spyOn(document, "removeEventListener")
    const { result, unmount } = mount()
    const context: PlantContext = result.current
    unmount()
    expect(removeListener).toHaveBeenCalledWith("visibilitychange", expect.any(Function))
    expect(vi.getTimerCount()).toBe(0)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(context.simulatedSeconds).toBe(0)
    removeListener.mockRestore()
  })
})

// Every field of the state as "Slice.field" -> value, to see which fields an action changed
function flatten(state: PowerPlantState): Record<string, unknown> {
  const flat: Record<string, unknown> = {}
  for (const [slice, fields] of Object.entries(state)) {
    for (const [field, value] of Object.entries(fields as Record<string, unknown>)) flat[`${slice}.${field}`] = value
  }
  return flat
}

function changed(before: PowerPlantState, after: PowerPlantState): Record<string, unknown> {
  const a: Record<string, unknown> = flatten(before)
  const b: Record<string, unknown> = flatten(after)
  return Object.fromEntries(Object.keys(b).filter((key: string) => a[key] !== b[key]).map((key: string) => [key, b[key]]))
}

type Row = {
  name: string
  // changes the loaded turbine-sync state before the action
  prepare?: (state: PowerPlantState) => void
  act: (context: PlantContext) => void
  // every field the action changes, with its new value
  expected: (before: PowerPlantState) => Record<string, unknown>
}

const rows: Row[] = [
  { name: "setGasRate", act: (c) => { c.setGasRate(0.5); }, expected: () => ({ "Boiler.gasRateCommand": 0.5 }) },
  { name: "toggleDrainValve", act: (c) => { c.toggleDrainValve(); }, expected: () => ({ "Boiler.drainValveOpen": true }) },
  {
    name: "setAttemperatorAuto",
    act: (c) => { c.setAttemperatorAuto(false); },
    expected: () => ({ "Boiler.attemperatorAuto": false }),
  },
  {
    name: "adjustSprayValve",
    prepare: (s) => {
      s.Boiler.attemperatorAuto = false
      s.Boiler.sprayValvePosition = 0.2
    },
    act: (c) => { c.adjustSprayValve(0.1); },
    expected: (s) => ({ "Boiler.sprayValvePosition": s.Boiler.sprayValvePosition + 0.1 }),
  },
  {
    name: "adjustBypassValve",
    act: (c) => { c.adjustBypassValve(0.1); },
    expected: (s) => ({ "Turbine.bypassValvePosition": s.Turbine.bypassValvePosition + 0.1 }),
  },
  { name: "toggleMainSteamValve", act: (c) => { c.toggleMainSteamValve(); }, expected: () => ({ "Turbine.mainSteamValve": false }) },
  {
    name: "adjustTurbineValve",
    act: (c) => { c.adjustTurbineValve(-0.01); },
    expected: (s) => ({ "Turbine.turbineValvePosition": s.Turbine.turbineValvePosition - 0.01 }),
  },
  {
    name: "setSpeedMode",
    prepare: (s) => {
      s.Turbine.generatorBreaker = false
      s.Turbine.speedMode = "free"
      s.Turbine.speedReference = 1000
    },
    act: (c) => { c.setSpeedMode("hold"); },
    expected: (s) => ({ "Turbine.speedMode": "hold", "Turbine.speedReference": s.Turbine.runUpPoint, "Turbine.pidIntegralError": 0 }),
  },
  {
    name: "selectRunUpPoint",
    prepare: (s) => {
      s.Turbine.generatorBreaker = false
      s.Turbine.speedMode = "free"
    },
    act: (c) => { c.selectRunUpPoint(1500); },
    expected: () => ({ "Turbine.runUpPoint": 1500 }),
  },
  {
    name: "toggleGeneratorBreaker",
    act: (c) => { c.toggleGeneratorBreaker(); },
    expected: (s) => ({
      "Turbine.generatorBreaker": false,
      "Turbine.speedMode": "free",
      "Turbine.pidIntegralError": 0,
      "Turbine.speedReference": s.Turbine.rpm,
    }),
  },
  { name: "setLoadSetpoint", act: (c) => { c.setLoadSetpoint(50); }, expected: () => ({ "Turbine.loadSetpoint": 50 }) },
  { name: "toggleDeaeratorVent", act: (c) => { c.toggleDeaeratorVent(); }, expected: () => ({ "Deaerator.startUpVentOpen": true }) },
  {
    name: "adjustFeedPumpValvePosition",
    act: (c) => { c.adjustFeedPumpValvePosition(0.1); },
    expected: (s) => ({ "Deaerator.feedPumpValvePosition": s.Deaerator.feedPumpValvePosition + 0.1 }),
  },
  {
    name: "toggleAirExtractionPump (on to off)",
    act: (c) => { c.toggleAirExtractionPump(); },
    expected: () => ({ "Condenser.isAirExtractionPumpEnabled": false }),
  },
  {
    name: "toggleAirExtractionPump (off to on)",
    prepare: (s) => {
      s.Condenser.isAirExtractionPumpEnabled = false
    },
    act: (c) => { c.toggleAirExtractionPump(); },
    expected: () => ({ "Condenser.isAirExtractionPumpEnabled": true }),
  },
  { name: "toggleSjae (on to off)", act: (c) => { c.toggleSjae(); }, expected: () => ({ "Condenser.isSjaeEnabled": false }) },
  {
    name: "toggleSjae (off to on)",
    prepare: (s) => {
      s.Condenser.isSjaeEnabled = false
    },
    act: (c) => { c.toggleSjae(); },
    expected: () => ({ "Condenser.isSjaeEnabled": true }),
  },
  {
    name: "adjustSjaeValvePosition",
    act: (c) => { c.adjustSjaeValvePosition(-0.25); },
    expected: () => ({ "Condenser.sjaeValvePosition": 0.75 }),
  },
  {
    name: "adjustRecirculationPumpValvePosition",
    act: (c) => { c.adjustRecirculationPumpValvePosition(0.1); },
    expected: (s) => ({ "Condenser.recirculationPumpValvePosition": s.Condenser.recirculationPumpValvePosition + 0.1 }),
  },
  {
    name: "adjustCondensationPumpValvePosition",
    act: (c) => { c.adjustCondensationPumpValvePosition(0.1); },
    expected: (s) => ({ "Condenser.condensationPumpValvePosition": s.Condenser.condensationPumpValvePosition + 0.1 }),
  },
  {
    name: "adjustMakeupValvePosition",
    act: (c) => { c.adjustMakeupValvePosition(0.3); },
    expected: () => ({ "Condenser.makeupValvePosition": 0.3 }),
  },
  {
    name: "adjustRejectValvePosition",
    act: (c) => { c.adjustRejectValvePosition(0.4); },
    expected: () => ({ "Condenser.rejectValvePosition": 0.4 }),
  },
]

describe("action creators", () => {
  it.each(rows)("$name changes exactly the field it names", (row: Row) => {
    const { result } = mount()
    const start: PowerPlantState = validatedState("turbine-sync", turbineSync)
    row.prepare?.(start)
    loadState(result, start)
    const before: PowerPlantState = result.current.state
    act(() => {
      row.act(result.current)
    })
    expect(changed(before, result.current.state)).toEqual(row.expected(before))
  })

  it("setPlaybackSpeed sets the speed and leaves the plant alone", () => {
    const { result } = mount()
    const before: PowerPlantState = result.current.state
    act(() => {
      result.current.setPlaybackSpeed(60)
    })
    expect(result.current.playbackSpeed).toBe(60)
    expect(result.current.state).toBe(before)
  })

  it("covers every action creator of the context", () => {
    const { result } = mount()
    const creators: string[] = Object.keys(result.current).filter(
      (key: string) => typeof (result.current as Record<string, unknown>)[key] === "function",
    )
    const covered: string[] = rows.map((row: Row) => row.name.replace(/ \(.*\)$/, ""))
    const exempt: string[] = ["dispatch", "setPlaybackSpeed"]
    expect(creators.filter((key: string) => !covered.includes(key) && !exempt.includes(key))).toEqual([])
  })
})
