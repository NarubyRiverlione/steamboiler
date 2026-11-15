import { describe, expect, test } from "vitest"
import { CstSimulation } from "../src/context/const"
import { linePath, niceTicks, panels, toReportHtml, yRange } from "./report"
import { runScenario, Scenario } from "./scenario"

const scenario: Scenario = {
  name: "test-heat-up",
  description: "Gas on, nothing else",
  duration: 60,
  sampleEvery: 10,
  actions: [{ at: 0, action: { type: "SET_GAS_RATE", payload: { gasRateCommand: 1 } } }],
}

const embedded = (html: string) => {
  const match = /<script type="application\/json" id="data">(.*?)<\/script>/s.exec(html)
  if (!match) throw new Error("no embedded data")
  return JSON.parse(match[1]) as { times: number[]; panels: { series: { values: number[] }[] }[] }
}

describe("toReportHtml", () => {
  const html = toReportHtml(scenario, runScenario(scenario))

  test("has a colour for every series of every panel", () => {
    const most = Math.max(...panels.map((p) => p.series.length))
    for (let i = 1; i <= most; i++) {
      expect(html).toContain(`--series-${String(i)}:`)
      expect(html).toContain(`.series.s${String(i)} {`)
    }
  })

  test("is self-contained: no external scripts, stylesheets or images", () => {
    expect(html).not.toMatch(/<script[^>]+src=/)
    expect(html).not.toMatch(/<link[^>]+stylesheet/)
    expect(html).not.toMatch(/https?:\/\//)
  })

  test("has one panel per definition, each a chart wired to the shared hover readout", () => {
    expect(html.match(/<figure class="panel kind-/g)).toHaveLength(panels.length)
    expect(html.match(/<svg /g)).toHaveLength(panels.length)
    expect(html).toContain('querySelectorAll(".panel")')
  })

  test("hotwell level is volume over the condenser total volume, in percent", () => {
    const level = panels.find((p) => p.title === "Hotwell level")?.series[0]
    const state = runScenario(scenario)[0].state
    const ratio = state.Condenser.hotwellWaterVolume / CstSimulation.CstCondenser.TotalVolume
    expect(level?.value(state)).toBeCloseTo(ratio * 100)
    expect(level?.value({ ...state, Condenser: { ...state.Condenser, hotwellWaterVolume: 0 } })).toBe(0)
    expect(
      level?.value({
        ...state,
        Condenser: { ...state.Condenser, hotwellWaterVolume: CstSimulation.CstCondenser.TotalVolume },
      }),
    ).toBe(100)
  })

  test("embeds every sample for every series", () => {
    const data = embedded(html)
    expect(data.times).toEqual([0, 10, 20, 30, 40, 50])
    expect(data.panels).toHaveLength(panels.length)
    for (const panel of data.panels) for (const series of panel.series) expect(series.values).toHaveLength(6)
  })

  test("draws no NaN coordinates", () => {
    expect(html).not.toContain("NaN")
  })

  test("escapes scenario text and cannot break out of the data script", () => {
    const hostile = { ...scenario, name: "</script><b>x", description: "a & b" }
    const out = toReportHtml(hostile, runScenario(scenario))
    expect(out).toContain("&lt;/script&gt;&lt;b&gt;x")
    expect(out).toContain("a &amp; b")
    expect(out).not.toContain("<b>x")
  })
})

describe("toReportHtml heating rate", () => {
  // The test run heats at 5000 L/s, about 0.57 K/s: above the 100 K/h limit
  const html = toReportHtml(scenario, runScenario(scenario))
  const heatingRate = panels.find((p) => p.title === "Heating rate")

  test("the boiler group has a heating-rate chart in K/h, from the smoothed rate", () => {
    expect(heatingRate?.group).toBe("Boiler")
    expect(heatingRate?.unit).toBe("K/h")
    const state = runScenario(scenario).at(-1)?.state
    if (!state || !heatingRate) throw new Error("no state or panel")
    expect(heatingRate.series[0].value(state)).toBeCloseTo(state.Boiler.heatingRate * 3600, 9)
  })

  test("draws a limit line only on the charts that declare one", () => {
    expect(heatingRate?.limit).toBeCloseTo(100, 9)
    expect(html.match(/<line class="limit"/g)).toHaveLength(
      panels.filter((p) => p.limit !== undefined).length,
    )
  })

  test("keeps the limit inside the plot even when the rate stays far below it", () => {
    const calm = {
      ...scenario,
      actions: [{ at: 0, action: { type: "SET_GAS_RATE", payload: { gasRateCommand: 0.1 } } as const }],
    }
    const y = /<line class="limit"[^>]* y1="([\d.]+)"/.exec(toReportHtml(calm, runScenario(calm)))?.[1]
    expect(Number(y)).toBeGreaterThanOrEqual(10)
    expect(Number(y)).toBeLessThanOrEqual(156)
  })
})

describe("toReportHtml relief valve lifts", () => {
  const samples = runScenario(scenario)
  const lifts = [
    { open: 20, close: 26.5, vented: 2934.4 },
    { open: 50, vented: 120 },
  ]
  const html = toReportHtml(scenario, samples, lifts)

  test("marks each lift as a band on every chart, an open lift up to the end", () => {
    expect(html.match(/<rect class="lift"/g)).toHaveLength(2 * panels.length)
    // x = left padding 52 + t / 50 s × plot width 416
    expect(html).toContain('<rect class="lift" x="218.4" y="10" width="54.1" height="146"/>')
    expect(html).toContain('<rect class="lift" x="468.0" y="10" width="0.0" height="146"/>')
  })

  test("lists each lift with its open and close time and the steam it vented", () => {
    expect(html).toContain("Relief valve lifts (2)")
    expect(html).toContain("<li>0:20 – 0:27 (6.5 s) — vented 2,934 kg</li>")
    expect(html).toContain("<li>0:50 – still open — vented 120 kg</li>")
  })

  test("a run without lifts says so", () => {
    expect(toReportHtml(scenario, samples)).toContain("Relief valve lifts (0)")
    expect(toReportHtml(scenario, samples)).not.toContain('class="lift"')
  })
})

describe("toReportHtml burner trip", () => {
  const samples = runScenario(scenario)

  test("notes when the burner tripped, with the time of the first tripped sample", () => {
    const tripped = samples.map((s, i) =>
      i < 3 ? s : { ...s, state: { ...s.state, Boiler: { ...s.state.Boiler, burnerTripped: true } } },
    )
    expect(toReportHtml(scenario, tripped)).toContain(`Burner trip at 0:${String(samples[3].time)}`)
  })

  test("a run where the burner never tripped has no burner trip line", () => {
    expect(toReportHtml(scenario, samples)).not.toContain("Burner trip at")
  })
})

describe("niceTicks", () => {
  test("steps by 1/2/5 × 10^k within the range", () => {
    expect(niceTicks(0, 30, 5)).toEqual([0, 10, 20, 30])
    expect(niceTicks(0.3, 1.9, 4)).toEqual([0.5, 1, 1.5])
  })
})

describe("yRange", () => {
  test("pads a varying series by 5%", () => {
    expect(yRange([0, 100])).toEqual([-5, 105])
  })
  test("gives flat and all-zero series a non-empty range", () => {
    expect(yRange([0, 0])).toEqual([-1, 1])
    expect(yRange([10, 10])).toEqual([9, 11])
  })
  test("ignores non-finite values and falls back when none are finite", () => {
    expect(yRange([NaN, 0, 100, Infinity])).toEqual([-5, 105])
    expect(yRange([NaN])).toEqual([0, 1])
  })
})

describe("linePath", () => {
  const id = (n: number) => n
  test("breaks the line at non-finite values", () => {
    expect(linePath([0, 1, 2, 3], [1, NaN, 2, 3], id, id)).toBe("M0.0,1.0M2.0,2.0L3.0,3.0")
  })
})
