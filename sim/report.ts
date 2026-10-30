import { CstSimulation } from "../src/context/const"
import PowerPlantState from "../src/context/PowerPlantState"
import { loopWater } from "./invariants"
import { Sample, Scenario } from "./scenario"

type Series = { label: string; value: (state: PowerPlantState) => number }
export type Panel = { group: string; title: string; unit: string; series: Series[] }

const one = (label: string, value: Series["value"]): Series[] => [{ label, value }]

export const panels: Panel[] = [
  {
    group: "Boiler",
    title: "Temperature",
    unit: "°C",
    series: one("Temperature", (s) => s.Boiler.temperature),
  },
  { group: "Boiler", title: "Pressure", unit: "bar", series: one("Pressure", (s) => s.Boiler.pressure) },
  {
    group: "Boiler",
    title: "Water volume",
    unit: "L",
    series: one("Water volume", (s) => s.Boiler.waterVolume),
  },
  { group: "Boiler", title: "Steam mass", unit: "kg", series: one("Steam mass", (s) => s.Boiler.steamMass) },
  {
    group: "Boiler",
    title: "Energy delta",
    unit: "kJ/s",
    series: one("Energy delta", (s) => s.Boiler.energyDelta),
  },
  { group: "Turbine", title: "RPM", unit: "rpm", series: one("RPM", (s) => s.Turbine.rpm) },
  {
    group: "Turbine",
    title: "Steam flow",
    unit: "kg/s",
    series: [
      { label: "Turbine", value: (s) => s.Turbine.turbineSteamFlowOut },
      { label: "Bypass", value: (s) => s.Turbine.bypassSteamFlowOut },
    ],
  },
  {
    group: "Turbine",
    title: "Electric output",
    unit: "MW",
    series: one("Output", (s) => s.Turbine.electricOutput),
  },
  {
    group: "Condenser",
    title: "Pressure",
    unit: "mbar",
    series: one("Pressure", (s) => s.Condenser.pressure),
  },
  {
    group: "Condenser",
    title: "Hotwell volume",
    unit: "L",
    series: one("Hotwell volume", (s) => s.Condenser.hotwellWaterVolume),
  },
  {
    group: "Condenser",
    title: "Return rate",
    unit: "L/tick",
    series: one("Return rate", (s) => s.Condenser.returnRate),
  },
  {
    group: "Condenser",
    title: "Hotwell temperature",
    unit: "°C",
    series: one("Hotwell temperature", (s) => s.Condenser.hotwellTemperature),
  },
  // The closed water loop: boiler → steam → condenser → hotwell → condensation pump → boiler
  {
    group: "Loop",
    title: "Water inventory",
    unit: "L",
    series: [
      { label: "Boiler water", value: (s) => s.Boiler.waterVolume },
      { label: "Boiler steam", value: (s) => s.Boiler.steamMass },
      { label: "Condenser steam", value: (s) => s.Condenser.steamMass },
      { label: "Hotwell", value: (s) => s.Condenser.hotwellWaterVolume },
      { label: "Total excl. makeup, reject, drain", value: loopWater },
    ],
  },
  {
    group: "Loop",
    title: "Flows",
    unit: "L/s",
    series: [
      { label: "Steam out", value: (s) => s.Turbine.bypassSteamFlowOut + s.Turbine.turbineSteamFlowOut },
      { label: "Condenser intake", value: (s) => s.Condenser.intakeFlowRate },
      { label: "Condensation", value: (s) => s.Condenser.condensationRate },
      { label: "Return to boiler", value: (s) => s.Condenser.returnRate / CstSimulation.DeltaTime },
    ],
  },
  {
    group: "Loop",
    title: "Valve positions",
    unit: "%",
    series: [
      { label: "Bypass", value: (s) => s.Turbine.bypassValvePosition * 100 },
      { label: "Cooling water", value: (s) => s.Condenser.recirculationPumpValvePosition * 100 },
      { label: "Condensation pump", value: (s) => s.Condenser.condensationPumpValvePosition * 100 },
      { label: "Makeup", value: (s) => s.Condenser.makeupValvePosition * 100 },
      { label: "Reject", value: (s) => s.Condenser.rejectValvePosition * 100 },
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

  return `<figure class="panel" data-panel="${String(index)}">
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

const STYLE = `
:root {
  color-scheme: light;
  --surface: #fcfcfb; --card: #ffffff; --border: #e4e3df;
  --text-primary: #0b0b0b; --text-secondary: #52514e; --text-muted: #77756f;
  --grid: #ecebe7; --axis: #b9b7b0; --action: #a8a59c;
  --series-1: #2a78d6; --series-2: #eb6834; --series-3: #1baf7a; --series-4: #eda100; --series-5: #e87ba4;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --surface: #1a1a19; --card: #222220; --border: #34332f;
    --text-primary: #f0efec; --text-secondary: #c3c2b7; --text-muted: #8f8d85;
    --grid: #2c2b28; --axis: #55534d; --action: #6d6a62;
    --series-1: #3987e5; --series-2: #d95926; --series-3: #199e70; --series-4: #c98500; --series-5: #d55181;
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --surface: #1a1a19; --card: #222220; --border: #34332f;
  --text-primary: #f0efec; --text-secondary: #c3c2b7; --text-muted: #8f8d85;
  --grid: #2c2b28; --axis: #55534d; --action: #6d6a62;
  --series-1: #3987e5; --series-2: #d95926; --series-3: #199e70; --series-4: #c98500; --series-5: #d55181;
}
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
.panel { margin: 0; background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px 6px; }
figcaption { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.title { font-weight: 600; }
.unit { color: var(--text-muted); font-weight: 400; }
.readout { display: flex; flex-wrap: wrap; gap: 4px 12px; font-variant-numeric: tabular-nums; color: var(--text-secondary); }
.readout strong { color: var(--text-primary); }
.legend { list-style: none; margin: 2px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 4px 12px; color: var(--text-secondary); font-size: 12px; }
.key { display: inline-block; width: 14px; height: 2px; vertical-align: middle; margin-right: 4px; border-radius: 1px; }
.line-key { display: inline-block; width: 10px; height: 2px; vertical-align: middle; margin-right: 4px; }
.key.s1, .line-key.s1 { background: var(--series-1); }
.key.s2, .line-key.s2 { background: var(--series-2); }
.key.s3, .line-key.s3 { background: var(--series-3); }
.key.s4, .line-key.s4 { background: var(--series-4); }
.key.s5, .line-key.s5 { background: var(--series-5); }
svg { display: block; width: 100%; height: auto; touch-action: none; }
svg:focus-visible { outline: 2px solid var(--series-1); outline-offset: 2px; border-radius: 4px; }
.grid { stroke: var(--grid); stroke-width: 1; }
.axis { stroke: var(--axis); stroke-width: 1; }
.tick { fill: var(--text-muted); font-size: 11px; font-variant-numeric: tabular-nums; }
.action { stroke: var(--action); stroke-width: 1; stroke-dasharray: 3 3; }
.series { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.series.s1 { stroke: var(--series-1); }
.series.s2 { stroke: var(--series-2); }
.series.s3 { stroke: var(--series-3); }
.series.s4 { stroke: var(--series-4); }
.series.s5 { stroke: var(--series-5); }
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
      const figures = panels
        .map((p, i) => (p.group === group ? renderPanel(p, i, times, values[i], actionTimes) : ""))
        .join("")
      return `<section><h2>${escapeHtml(group)}</h2><div class="grid-panels">${figures}</div></section>`
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
