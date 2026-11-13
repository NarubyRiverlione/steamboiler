import { describe, expect, it } from "vitest"
import { levelZones, zoneOf, type LevelLimits } from "./levelZones"

const HOTWELL: LevelLimits = {
  trip: { low: 0.1, high: 0.95 },
  alarm: { low: 0.25, high: 0.85 },
  working: { low: 0.55, high: 0.75 },
}

describe("levelZones", () => {
  it("builds the red, orange and green zones in percent", () => {
    expect(levelZones(HOTWELL)).toEqual([
      { from: 0, to: 10, tone: "alarm" },
      { from: 95, to: 100, tone: "alarm" },
      { from: 10, to: 25, tone: "warn" },
      { from: 85, to: 95, tone: "warn" },
      { from: 55, to: 75, tone: "ok" },
    ])
  })

  it("builds only what is given", () => {
    expect(levelZones({})).toEqual([])
    expect(levelZones({ trip: { low: 0.2 } })).toEqual([{ from: 0, to: 20, tone: "alarm" }])
    expect(levelZones({ working: { low: 0.45, high: 0.55 } })).toEqual([{ from: 45, to: 55, tone: "ok" }])
  })

  it("runs an alarm without a trip to the end of the scale", () => {
    expect(levelZones({ alarm: { low: 0.3, high: 0.8 } })).toEqual([
      { from: 0, to: 30, tone: "warn" },
      { from: 80, to: 100, tone: "warn" },
    ])
  })

  it("keeps the float noise of a fraction times 100 out of the edges", () => {
    expect(levelZones({ working: { low: 0.55, high: 0.75 } })[0]).toEqual({ from: 55, to: 75, tone: "ok" })
  })
})

describe("zoneOf", () => {
  const zones = levelZones(HOTWELL)

  it.each([
    [0, "alarm"],
    [0.09, "alarm"],
    [0.1, "warn"], // the trip is below the limit
    [0.24, "warn"],
    [0.25, "none"], // the alarm is below the limit
    [0.54, "none"],
    [0.55, "ok"], // green holds both ends
    [0.75, "ok"],
    [0.76, "none"],
    [0.84, "none"],
    [0.85, "warn"], // the high alarm is from the limit
    [0.94, "warn"],
    [0.95, "alarm"],
    [1, "alarm"],
  ])("puts %f in %s", (level: number, tone: string) => {
    expect(zoneOf(level, zones)).toBe(tone)
  })

  it("is none without zones", () => {
    expect(zoneOf(0.5, [])).toBe("none")
  })
})
