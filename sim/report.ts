import { CstSimulation } from "../src/context/const"
import PowerPlantState from "../src/context/PowerPlantState"
import { loopWater } from "./invariants"
import { Sample, Scenario } from "./scenario"

type Series = { label: string; value: (state: PowerPlantState) => number }
// Colour code: temperature red, pressure green, volume blue, flows one hue each, valve position white, anything else amber.
export type Kind = "temperature" | "pressure" | "volume" | "flow" | "valve" | "other"

// row: panels sharing a row number render on one line; a group without rows keeps the auto-filling grid.
// Flow charts each get their own hue; every other chart uses its kind's colour.
export type Palette =
  Kind | "flowSteam" | "flowIntake" | "flowReturn" | "flowCondensation" | "flowGas" | "inventory"

export type Panel = {
  group: string
  row?: number
  title: string
  kind: Kind
  palette?: Palette
  unit: string
  series: Series[]
}

const one = (label: string, value: Series["value"]): Series[] => [{ label, value }]

export const panels: Panel[] = [
  {
    group: "Boiler",
    title: "Gas flow",
    kind: "flow",
    palette: "flowGas",
    unit: "L/s",
    series: one("Gas flow", (s) => s.Boiler.gasFlow),
  },
  {
    group: "Boiler",
    title: "Temperature",
    kind: "temperature",
    unit: "°C",
    series: one("Temperature", (s) => s.Boiler.temperature),
  },
  {
    group: "Boiler",
    title: "Pressure",
    kind: "pressure",
    unit: "bar",
    series: one("Pressure", (s) => s.Boiler.pressure),
  },
  {
    group: "Boiler",
    title: "Water volume",
    kind: "volume",
    unit: "L",
    series: one("Water volume", (s) => s.Boiler.waterVolume),
  },
  {
    group: "Boiler",
    title: "Steam mass",
    kind: "volume",
    unit: "kg",
    series: one("Steam mass", (s) => s.Boiler.steamMass),
  },
  {
    group: "Boiler",
    title: "Energy delta",
    kind: "other",
    unit: "kJ/s",
    series: one("Energy delta", (s) => s.Boiler.energyDelta),
  },
  // Turbine
  {
    group: "Turbine",
    row: 1,
    title: "Bypass valve",
    kind: "valve",
    unit: "%",
    series: one("Bypass valve", (s) => s.Turbine.bypassValvePosition * 100),
  },
  {
    group: "Turbine",
    row: 1,
    title: "Turbine valve",
    kind: "valve",
    unit: "%",
    series: one("Turbine valve", (s) => s.Turbine.turbineValvePosition * 100),
  },
  {
    group: "Turbine",
    row: 1,
    title: "Steam flow",
    kind: "flow",
    palette: "flowSteam",
    unit: "kg/s",
    series: [
      { label: "Turbine", value: (s) => s.Turbine.turbineSteamFlowOut },
      { label: "Bypass", value: (s) => s.Turbine.bypassSteamFlowOut },
      { label: "Total", value: (s) => s.Turbine.bypassSteamFlowOut + s.Turbine.turbineSteamFlowOut },
    ],
  },
  {
    group: "Turbine",
    row: 2,
    title: "RPM",
    kind: "other",
    unit: "rpm",
    series: one("RPM", (s) => s.Turbine.rpm),
  },
  {
    group: "Turbine",
    row: 2,
    title: "Electric output",
    kind: "other",
    unit: "MW",
    series: one("Output", (s) => s.Turbine.electricOutput),
  },
  // Condenser. Flows in kg/s: steam intake is kg/s, and 1 L of condensate is taken as 1 kg.
  {
    group: "Condenser",
    row: 1,
    title: "SJAE valve",
    kind: "valve",
    unit: "%",
    series: one("SJAE valve", (s) => s.Condenser.sjaeValvePosition * 100),
  },
  {
    group: "Condenser",
    row: 1,
    title: "Pressure",
    kind: "pressure",
    unit: "mbar",
    series: one("Pressure", (s) => s.Condenser.pressure),
  },
  {
    group: "Condenser",
    row: 1,
    title: "Cooling water valve",
    kind: "valve",
    unit: "%",
    series: one("Cooling water valve", (s) => s.Condenser.recirculationPumpValvePosition * 100),
  },
  {
    group: "Condenser",
    row: 2,
    title: "Condensation pump valve",
    kind: "valve",
    unit: "%",
    series: one("Condensation pump valve", (s) => s.Condenser.condensationPumpValvePosition * 100),
  },
  {
    group: "Condenser",
    row: 2,
    title: "Intake flow",
    kind: "flow",
    palette: "flowIntake",
    unit: "kg/s",
    series: one("Intake flow", (s) => s.Condenser.intakeFlowRate),
  },
  {
    group: "Condenser",
    row: 2,
    title: "Return to boiler",
    kind: "flow",
    palette: "flowReturn",
    unit: "kg/s",
    series: one("Return to boiler", (s) => s.Condenser.returnRate / CstSimulation.DeltaTime),
  },
  {
    group: "Condenser",
    row: 3,
    title: "Condensation rate",
    kind: "flow",
    palette: "flowCondensation",
    unit: "kg/s",
    series: one("Condensation rate", (s) => s.Condenser.condensationRate),
  },
  // Hotwell: level is hotwell volume over the condenser's TotalVolume, shown in %
  {
    group: "Hotwell",
    row: 1,
    title: "Hotwell level",
    kind: "volume",
    unit: "%",
    series: one(
      "Level",
      (s) => (s.Condenser.hotwellWaterVolume / CstSimulation.CstCondenser.TotalVolume) * 100,
    ),
  },
  {
    group: "Hotwell",
    row: 1,
    title: "Makeup and reject valves",
    kind: "valve",
    unit: "%",
    series: [
      { label: "Makeup", value: (s) => s.Condenser.makeupValvePosition * 100 },
      { label: "Reject", value: (s) => s.Condenser.rejectValvePosition * 100 },
    ],
  },
  {
    group: "Hotwell",
    row: 1,
    title: "Hotwell temperature",
    kind: "temperature",
    unit: "°C",
    series: one("Hotwell temperature", (s) => s.Condenser.hotwellTemperature),
  },
  // The closed water loop: boiler → steam → condenser → hotwell → condensation pump → boiler
  {
    group: "Loop",
    title: "Water inventory",
    kind: "volume",
    palette: "inventory",
    unit: "L",
    series: [
      { label: "Boiler water", value: (s) => s.Boiler.waterVolume },
      { label: "Boiler steam", value: (s) => s.Boiler.steamMass },
      { label: "Condenser steam", value: (s) => s.Condenser.steamMass },
      { label: "Hotwell", value: (s) => s.Condenser.hotwellWaterVolume },
      { label: "Total excl. makeup, reject, drain", value: loopWater },
    ],
  },
]

// Plot area inside each panel's SVG viewBox
const W = 480
const H = 180
const PAD = { left: 52, right: 12, top: 10, bottom: 24 }
const plotW = W - PAD.left - PAD.right
const plotH = H - PAD.top - PAD.bottom

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2))

// "Nice" axis ticks (1/2/5 × 10^k) covering [min, max].
export function niceTicks(min: number, max: number, count = 4): number[] {
  const raw = (max - min) / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = ([1, 2, 5, 10].find((m) => m * mag >= raw) ?? 10) * mag
  const ticks: number[] = []
  for (let t = Math.ceil(min / step) * step; t <= max + step * 1e-9; t += step)
    ticks.push(Number(t.toPrecision(12)))
  return ticks
}

// Y range over all finite values, padded so flat or empty series still get a usable axis.
export function yRange(values: number[]): [number, number] {
  const finite = values.filter(Number.isFinite)
  if (finite.length === 0) return [0, 1]
  const min = Math.min(...finite)
  const max = Math.max(...finite)
  if (min === max) return min === 0 ? [-1, 1] : [min - Math.abs(min) * 0.1, max + Math.abs(max) * 0.1]
  const pad = (max - min) * 0.05
  return [min - pad, max + pad]
}

// SVG path through the points; non-finite values break the line instead of poisoning it.
export function linePath(
  times: number[],
  values: number[],
  x: (t: number) => number,
  y: (v: number) => number,
) {
  let d = ""
  let pen = "M"
  values.forEach((v, i) => {
    if (!Number.isFinite(v)) {
      pen = "M"
      return
    }
    d += `${pen}${x(times[i]).toFixed(1)},${y(v).toFixed(1)}`
    pen = "L"
  })
  return d
}

const clock = (seconds: number) =>
  `${String(Math.floor(seconds / 60))}:${String(Math.round(seconds % 60)).padStart(2, "0")}`

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

function renderPanel(
  panel: Panel,
  index: number,
  times: number[],
  values: number[][],
  actionTimes: number[],
) {
  const tEnd = times[times.length - 1] || 1
  const [yMin, yMax] = yRange(values.flat())
  const x = (t: number) => PAD.left + (t / tEnd) * plotW
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * plotH

  const yGrid = niceTicks(yMin, yMax)
    .map(
      (v) =>
        `<line class="grid" x1="${String(PAD.left)}" x2="${String(W - PAD.right)}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/>` +
        `<text class="tick" x="${String(PAD.left - 6)}" y="${y(v).toFixed(1)}" text-anchor="end" dy="0.32em">${fmt(v)}</text>`,
    )
    .join("")
  const xTicks = niceTicks(0, tEnd / 60, 5)
    .map(
      (m) =>
        `<text class="tick" x="${x(m * 60).toFixed(1)}" y="${String(H - 6)}" text-anchor="middle">${String(m)}</text>`,
    )
    .join("")
  const actions = actionTimes
    .map(
      (t) =>
        `<line class="action" x1="${x(t).toFixed(1)}" x2="${x(t).toFixed(1)}" y1="${String(PAD.top)}" y2="${String(H - PAD.bottom)}"/>`,
    )
    .join("")
  const lines = values
    .map((v, i) => `<path class="series s${String(i + 1)}" d="${linePath(times, v, x, y)}"/>`)
    .join("")
  const legend =
    panel.series.length > 1
      ? `<ul class="legend">${panel.series.map((s, i) => `<li><span class="key s${String(i + 1)}"></span>${escapeHtml(s.label)}</li>`).join("")}</ul>`
      : ""

  return `<figure class="panel kind-${panel.palette ?? panel.kind}" data-panel="${String(index)}">
<figcaption><span class="title">${escapeHtml(panel.title)} <span class="unit">${escapeHtml(panel.unit)}</span></span><span class="readout"></span></figcaption>
${legend}
<svg viewBox="0 0 ${String(W)} ${String(H)}" tabindex="0" role="img" aria-label="${escapeHtml(`${panel.group} ${panel.title} over time`)}">
${yGrid}<line class="axis" x1="${String(PAD.left)}" x2="${String(W - PAD.right)}" y1="${String(H - PAD.bottom)}" y2="${String(H - PAD.bottom)}"/>${xTicks}${actions}${lines}
<line class="crosshair" y1="${String(PAD.top)}" y2="${String(H - PAD.bottom)}" visibility="hidden"/>
</svg></figure>`
}

// Embedded data: script-safe JSON (no "</script>" breakout).
const jsonForScript = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c")

const CLIENT_SCRIPT = `
const data = JSON.parse(document.getElementById("data").textContent)
const { times, panels, actions, plot } = data
const tEnd = times[times.length - 1] || 1
const fmt = (v) => !Number.isFinite(v) ? String(v) : Math.abs(v) >= 1000 ? Math.round(v).toLocaleString("en") : Math.abs(v) >= 10 ? v.toFixed(1) : v.toPrecision(3)
const clock = (s) => Math.floor(s / 60) + ":" + String(Math.round(s % 60)).padStart(2, "0")
const figures = [...document.querySelectorAll(".panel")]
const status = document.getElementById("cursor")

function show(i) {
  const t = times[i]
  const xPos = (plot.left + (t / tEnd) * plot.width).toFixed(1)
  figures.forEach((fig, p) => {
    const cross = fig.querySelector(".crosshair")
    cross.setAttribute("x1", xPos)
    cross.setAttribute("x2", xPos)
    cross.setAttribute("visibility", "visible")
    const readout = fig.querySelector(".readout")
    readout.replaceChildren()
    panels[p].series.forEach((s, k) => {
      const item = document.createElement("span")
      item.className = "value"
      const key = document.createElement("span")
      key.className = "line-key s" + (k + 1)
      const strong = document.createElement("strong")
      strong.textContent = fmt(s.values[i])
      item.append(key, strong)
      if (panels[p].series.length > 1) item.append(" " + s.label)
      readout.append(item)
    })
  })
  const here = actions.filter((a) => Math.abs(a.at - t) < (times[1] - times[0] || 1) / 2)
  status.textContent = "t = " + clock(t) + " (" + t + " s)" + (here.length ? " — " + here.map((a) => a.type).join(", ") : "")
}

let current = times.length - 1
const nearest = (svg, clientX) => {
  const box = svg.getBoundingClientRect()
  const vx = ((clientX - box.left) / box.width) * plot.viewWidth
  const t = ((vx - plot.left) / plot.width) * tEnd
  let best = 0
  times.forEach((tt, i) => { if (Math.abs(tt - t) < Math.abs(times[best] - t)) best = i })
  return best
}
for (const svg of document.querySelectorAll(".panel svg")) {
  svg.addEventListener("pointermove", (e) => { current = nearest(svg, e.clientX); show(current) })
  svg.addEventListener("keydown", (e) => {
    const step = e.shiftKey ? 10 : 1
    if (e.key === "ArrowRight") current = Math.min(times.length - 1, current + step)
    else if (e.key === "ArrowLeft") current = Math.max(0, current - step)
    else return
    e.preventDefault()
    show(current)
  })
}
show(current)
`

// Up to five line colours per kind (shades of one hue), for light and dark surfaces.
const PALETTE: Record<Palette, { light: string[]; dark: string[] }> = {
  temperature: {
    light: ["#d92d20", "#f97066", "#7a271a", "#fda29b", "#b42318"],
    dark: ["#f04438", "#fda29b", "#d92d20", "#fecdca", "#b42318"],
  },
  pressure: {
    light: ["#12a150", "#6ce9a6", "#05603a", "#a6f4c5", "#039855"],
    dark: ["#32d583", "#a6f4c5", "#12b76a", "#d1fadf", "#039855"],
  },
  volume: {
    light: ["#2a78d6", "#84caff", "#1849a9", "#b2ddff", "#1570ef"],
    dark: ["#3987e5", "#b2ddff", "#2e90fa", "#d1e9ff", "#1570ef"],
  },
  // Generic flow colour; the flow charts override it with their own hue below
  flow: {
    light: ["#2a78d6", "#84caff", "#1849a9", "#b2ddff", "#1570ef"],
    dark: ["#3987e5", "#b2ddff", "#2e90fa", "#d1e9ff", "#1570ef"],
  },
  flowSteam: {
    light: ["#7a5af8", "#bdb4fe", "#4a1fb8", "#d9d6fe", "#6938ef"],
    dark: ["#9b8afb", "#d9d6fe", "#7a5af8", "#ebe9fe", "#6938ef"],
  },
  flowIntake: {
    light: ["#06aed4", "#67e3f9", "#0e7090", "#a5f0fc", "#088ab2"],
    dark: ["#22ccee", "#a5f0fc", "#06aed4", "#cff9fe", "#088ab2"],
  },
  flowReturn: {
    light: ["#ee46bc", "#faa7e0", "#c11574", "#fcceee", "#dd2590"],
    dark: ["#f670c7", "#fcceee", "#ee46bc", "#fee6f6", "#dd2590"],
  },
  // Water inventory: one distinct hue per line, the total in ink/white
  inventory: {
    light: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#0b0b0b"],
    dark: ["#3987e5", "#d95926", "#199e70", "#c98500", "#ffffff"],
  },
  flowGas: {
    light: ["#f76b15", "#ffa66b", "#a8400a", "#ffd0ad", "#d9540a"],
    dark: ["#ff8a3d", "#ffd0ad", "#f76b15", "#ffe6d3", "#d9540a"],
  },
  flowCondensation: {
    light: ["#65a30d", "#a6ef67", "#3b7c0f", "#d3f8a8", "#4d7c0f"],
    dark: ["#85e13a", "#d3f8a8", "#66c61c", "#e3fbcc", "#4ca30d"],
  },
  // White on the dark theme; on the white light-theme cards it would vanish, so it turns to ink there
  valve: {
    light: ["#0b0b0b", "#77756f", "#3a3936", "#a8a59c", "#52514e"],
    dark: ["#ffffff", "#c3c2b7", "#e8e7e2", "#8f8d85", "#a8a69d"],
  },
  other: {
    light: ["#c98500", "#fdb022", "#93370d", "#fedf89", "#dc6803"],
    dark: ["#eda100", "#fedf89", "#f79009", "#fef0c7", "#dc6803"],
  },
}

const kindVars = (theme: "light" | "dark") =>
  (Object.keys(PALETTE) as Palette[])
    .map(
      (kind) =>
        `.kind-${kind} { ${PALETTE[kind][theme].map((c, i) => `--series-${String(i + 1)}: ${c};`).join(" ")} }`,
    )
    .join("\n")

const SURFACE_LIGHT = `color-scheme: light;
  --surface: #fcfcfb; --card: #ffffff; --border: #e4e3df;
  --text-primary: #0b0b0b; --text-secondary: #52514e; --text-muted: #77756f;
  --grid: #ecebe7; --axis: #b9b7b0; --action: #a8a59c;`
const SURFACE_DARK = `color-scheme: dark;
  --surface: #1a1a19; --card: #222220; --border: #34332f;
  --text-primary: #f0efec; --text-secondary: #c3c2b7; --text-muted: #8f8d85;
  --grid: #2c2b28; --axis: #55534d; --action: #6d6a62;`

const themeCss = () => `:root {
  ${SURFACE_LIGHT}
}
${kindVars("light")}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
  ${SURFACE_DARK}
  }
${kindVars("dark")
  .replace(/^/gm, "  ")
  .replace(/^ {2}\.kind/gm, '  :root:not([data-theme="light"]) .kind')}
}
:root[data-theme="dark"] {
  ${SURFACE_DARK}
}
${kindVars("dark").replace(/^\./gm, ':root[data-theme="dark"] .')}`

const STYLE = `
${themeCss()}
* { box-sizing: border-box; }
body { margin: 0; padding: 16px; background: var(--surface); color: var(--text-primary);
  font: 14px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif; }
header { position: sticky; top: 0; z-index: 1; background: var(--surface); padding-bottom: 8px; }
h1 { font-size: 20px; margin: 0 0 4px; }
h2 { font-size: 15px; margin: 24px 0 8px; color: var(--text-secondary); }
.meta, .hint { color: var(--text-secondary); margin: 0; }
#cursor { font-variant-numeric: tabular-nums; font-weight: 600; margin-top: 6px; }
details { margin-top: 8px; color: var(--text-secondary); }
details li { font-variant-numeric: tabular-nums; }
.grid-panels { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 380px), 1fr)); gap: 12px; }
.grid-row { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: 12px; margin-bottom: 12px; }
@media (max-width: 800px) { .grid-row { grid-template-columns: minmax(0, 1fr); } }
.panel { margin: 0; background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px 6px; }
figcaption { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.title { font-weight: 600; }
.unit { color: var(--text-muted); font-weight: 400; }
.readout { display: flex; flex-wrap: wrap; gap: 4px 12px; font-variant-numeric: tabular-nums; color: var(--text-secondary); }
.readout strong { color: var(--text-primary); }
.legend { list-style: none; margin: 2px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 4px 12px; color: var(--text-secondary); font-size: 12px; }
.key { display: inline-block; width: 14px; height: 2px; vertical-align: middle; margin-right: 4px; border-radius: 1px; }
.line-key { display: inline-block; width: 10px; height: 2px; vertical-align: middle; margin-right: 4px; }
${[1, 2, 3, 4, 5].map((i) => `.key.s${String(i)}, .line-key.s${String(i)} { background: var(--series-${String(i)}); }`).join("\n")}
svg { display: block; width: 100%; height: auto; touch-action: none; }
svg:focus-visible { outline: 2px solid var(--text-secondary); outline-offset: 2px; border-radius: 4px; }
.grid { stroke: var(--grid); stroke-width: 1; }
.axis { stroke: var(--axis); stroke-width: 1; }
.tick { fill: var(--text-muted); font-size: 11px; font-variant-numeric: tabular-nums; }
.action { stroke: var(--action); stroke-width: 1; stroke-dasharray: 3 3; }
.series { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
${[1, 2, 3, 4, 5].map((i) => `.series.s${String(i)} { stroke: var(--series-${String(i)}); }`).join("\n")}
.crosshair { stroke: var(--text-secondary); stroke-width: 1; pointer-events: none; }
`

// Self-contained report: one HTML file, no external resources, opens offline by double-click.
export function toReportHtml(scenario: Scenario, samples: Sample[]): string {
  const times = samples.map((s) => s.time)
  const values = panels.map((p) => p.series.map((s) => samples.map((sample) => s.value(sample.state))))
  const actionTimes = [...new Set(scenario.actions.map((a) => a.at))]
  const data = {
    times,
    panels: panels.map((p, i) => ({
      series: p.series.map((s, k) => ({ label: s.label, values: values[i][k] })),
    })),
    actions: scenario.actions.map((a) => ({ at: a.at, type: a.action.type })),
    plot: { left: PAD.left, width: plotW, viewWidth: W },
  }

  const groups = [...new Set(panels.map((p) => p.group))]
    .map((group) => {
      const figures = (inRow?: number) =>
        panels
          .map((p, i) =>
            p.group === group && p.row === inRow ? renderPanel(p, i, times, values[i], actionTimes) : "",
          )
          .join("")
      const rows = [
        ...new Set(panels.filter((p) => p.group === group && p.row !== undefined).map((p) => p.row)),
      ].sort((a, b) => (a ?? 0) - (b ?? 0))
      // Every row uses the widest row's column count, so a lone chart keeps tile width
      const cols = Math.max(
        0,
        ...rows.map((row) => panels.filter((p) => p.group === group && p.row === row).length),
      )
      const body = rows.length
        ? rows
            .map((row) => `<div class="grid-row" style="--cols:${String(cols)}">${figures(row)}</div>`)
            .join("")
        : `<div class="grid-panels">${figures(undefined)}</div>`
      return `<section><h2>${escapeHtml(group)}</h2>${body}</section>`
    })
    .join("\n")
  const actionList = scenario.actions
    .map((a) => `<li>${clock(a.at)} — ${escapeHtml(a.action.type)}</li>`)
    .join("")

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(scenario.name)} report</title>
<style>${STYLE}</style>
</head>
<body>
<header>
<h1>${escapeHtml(scenario.name)}</h1>
<p class="meta">${escapeHtml(scenario.description)} · ${clock(times[times.length - 1] ?? 0)} sim-time · ${String(samples.length)} samples every ${String(scenario.sampleEvery)} s · x-axis in minutes · dashed lines = operator actions</p>
<p class="hint">Hover a chart (or focus it and use ← →, Shift for ×10) to read all panels at one time.</p>
<p id="cursor"></p>
</header>
<details><summary>Operator actions (${String(scenario.actions.length)})</summary><ul>${actionList}</ul></details>
${groups}
<script type="application/json" id="data">${jsonForScript(data)}</script>
<script>${CLIENT_SCRIPT}</script>
</body>
</html>
`
}
