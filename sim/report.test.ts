import { describe, expect, test } from "vitest"
import { CstSimulation } from "../src/context/const"
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

  test("has one panel per definition, grouped by subsystem", () => {
    expect(html.match(/<figure class="panel kind-/g)).toHaveLength(panels.length)
    for (const group of ["Boiler", "Turbine", "Condenser", "Hotwell", "Loop"])
      expect(html).toContain(`<h2>${group}</h2>`)
    for (const title of [
      "Temperature",
      "RPM",
      "Steam flow",
      "Electric output",
      "Hotwell level",
      "Return to boiler",
    ])
      expect(html).toContain(title)
  })

  const rowTitles = (group: string, row: number) =>
    panels.filter((p) => p.group === group && p.row === row).map((p) => p.title)

  test("renders each declared row on its own line, in the layout of the tickets", () => {
    expect(html.match(/<div class="grid-row"/g)).toHaveLength(6)
    expect(rowTitles("Turbine", 1)).toEqual(["Bypass valve", "Turbine valve", "Steam flow"])
    expect(rowTitles("Turbine", 2)).toEqual(["RPM", "Electric output"])
    expect(rowTitles("Condenser", 1).slice(0, 2)).toEqual(["SJAE valve", "Pressure"])
    expect(rowTitles("Condenser", 2)).toEqual(["Condensation pump valve", "Intake flow", "Return to boiler"])
    expect(rowTitles("Hotwell", 1)).toEqual([
      "Hotwell level",
      "Makeup and reject valves",
      "Hotwell temperature",
    ])
    expect(html).toContain('<div class="grid-row" style="--cols:3">')
    expect(html).not.toContain('style="--cols:2"')
  })

  test("a chart alone in its row keeps the tile width of its group", () => {
    // Condenser: widest row has 3 charts, so the lone Condensation rate chart is one third wide
    expect(rowTitles("Condenser", 3)).toEqual(["Condensation rate"])
    expect(html.match(/style="--cols:3"/g)).toHaveLength(6)
    expect(html.match(/style="--cols:1"/g)).toBeNull()
  })

  test("keeps the auto-filling grid for groups without rows", () => {
    expect(
      panels.filter((p) => p.group === "Boiler" || p.group === "Loop").every((p) => p.row === undefined),
    ).toBe(true)
    expect(html.match(/<div class="grid-panels"/g)).toHaveLength(2)
  })

  test("every chart is wired to the shared hover readout", () => {
    expect(html.match(/<svg /g)).toHaveLength(panels.length)
    expect(html).toContain('querySelectorAll(".panel")')
  })

  test("drops the combined Loop flows and valve panels but keeps the water inventory", () => {
    const loop = panels.filter((p) => p.group === "Loop").map((p) => p.title)
    expect(loop).toEqual(["Water inventory"])
  })

  test("gives the formerly dropped series a home", () => {
    const labels = panels.flatMap((p) => p.series.map((s) => `${p.group}/${p.title}/${s.label}`))
    expect(labels).toContain("Condenser/Cooling water valve/Cooling water valve")
    expect(labels).toContain("Condenser/Condensation rate/Condensation rate")
    expect(labels).toContain("Turbine/Steam flow/Total")
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

  test("valves are plotted in percent and the hotwell is gone from the condenser group", () => {
    const valves = panels.filter((p) => p.title.toLowerCase().includes("valve"))
    expect(valves.every((p) => p.unit === "%")).toBe(true)
    expect(panels.filter((p) => p.group === "Condenser").map((p) => p.title)).not.toContain(
      "Hotwell temperature",
    )
  })

  test("colours charts by kind: temperature red, pressure green, volume and flow blue, valve white", () => {
    const kindOf = (title: string) => panels.filter((p) => p.title === title).map((p) => p.kind)
    expect(panels.filter((p) => /temperature/i.test(p.title)).every((p) => p.kind === "temperature")).toBe(
      true,
    )
    expect(panels.filter((p) => p.title === "Pressure").every((p) => p.kind === "pressure")).toBe(true)
    expect(
      panels.filter((p) => p.unit === "%" && /valve/i.test(p.title)).every((p) => p.kind === "valve"),
    ).toBe(true)
    expect(kindOf("Steam flow")).toEqual(["flow"])
    expect(kindOf("Water inventory")).toEqual(["volume"])
    expect(html.match(/<figure class="panel kind-valve"/g)).toHaveLength(
      panels.filter((p) => p.kind === "valve").length,
    )
    expect(html).toContain(".kind-temperature { --series-1: #d92d20;")
    expect(html).toContain(".kind-pressure { --series-1: #12a150;")
    expect(html).toContain('[data-theme="dark"] .kind-valve { --series-1: #ffffff;')
  })

  test("every flow chart has its own colour, different from the volume blue", () => {
    const flows = panels.filter((p) => p.kind === "flow")
    expect(flows).toHaveLength(5)
    const palettes = flows.map((p) => p.palette)
    expect(new Set(palettes).size).toBe(5)
    expect(palettes).not.toContain(undefined)
    for (const palette of palettes) expect(html).toContain(`.kind-${String(palette)} {`)
    expect(html).toContain('<figure class="panel kind-flowIntake"')
  })

  test("each line of the water inventory chart has its own colour", () => {
    const inventory = panels.find((p) => p.title === "Water inventory")
    expect(inventory?.series).toHaveLength(5)
    expect(inventory?.palette).toBe("inventory")
    const colors = /\.kind-inventory \{([^}]*)\}/.exec(html)?.[1].match(/#[0-9a-f]{6}/g) ?? []
    expect(new Set(colors).size).toBe(5)
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
