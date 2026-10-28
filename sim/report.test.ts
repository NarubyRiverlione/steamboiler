import { describe, expect, test } from "vitest"
import { linePath, niceTicks, panels, toReportHtml, yRange } from "./report"
import { runScenario, Scenario } from "./scenario"

const scenario: Scenario = {
  name: "test-heat-up",
  description: "Gas on, nothing else",
  duration: 60,
  sampleEvery: 10,
  actions: [{ at: 0, action: { type: "INCREASE_GAS_FLOW", amount: 5000 } }],
}

const embedded = (html: string) => {
  const match = /<script type="application\/json" id="data">(.*?)<\/script>/s.exec(html)
  if (!match) throw new Error("no embedded data")
  return JSON.parse(match[1]) as { times: number[]; panels: { series: { values: number[] }[] }[] }
}

describe("toReportHtml", () => {
  const html = toReportHtml(scenario, runScenario(scenario))

  test("is self-contained: no external scripts, stylesheets or images", () => {
    expect(html).not.toMatch(/<script[^>]+src=/)
    expect(html).not.toMatch(/<link[^>]+stylesheet/)
    expect(html).not.toMatch(/https?:\/\//)
  })

  test("has one panel per definition, grouped by subsystem", () => {
    expect(html.match(/<figure class="panel"/g)).toHaveLength(panels.length)
    for (const group of ["Boiler", "Turbine", "Condenser"]) expect(html).toContain(`<h2>${group}</h2>`)
    for (const title of [
      "Temperature",
      "RPM",
      "Steam flow",
      "Electric output",
      "Hotwell volume",
      "Return rate",
    ])
      expect(html).toContain(title)
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
