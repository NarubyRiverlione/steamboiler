import { mkdirSync, writeFileSync } from "node:fs"
import process from "node:process"
import { toCsv } from "./csv"
import { REPORTS_DIR, reportPaths } from "./report-paths"
import { toReportHtml } from "./report"
import { finalState, runScenario } from "./scenario"
import { scenarios } from "./scenarios"
import { saveSnapshot } from "./snapshot"

const DEFAULT_SCENARIO = "bypass-loop"

// usage: pnpm sim [scenario] [--snapshot name] (default scenario: bypass-loop)
// Writes sim/reports/<scenario>-<timestamp>.csv and .html
const args = process.argv.slice(2)
const flag = args.indexOf("--snapshot")
const snapshot = flag === -1 ? undefined : args.splice(flag, 2)[1]
if (flag !== -1 && !snapshot) {
  console.error("--snapshot needs a name")
  process.exit(1)
}
const name = args[0] ?? DEFAULT_SCENARIO
if (!Object.hasOwn(scenarios, name)) {
  console.error(`Unknown scenario "${name}". Available:`)
  for (const s of Object.values(scenarios)) console.error(`  ${s.name} — ${s.description}`)
  process.exit(1)
}
const scenario = scenarios[name]

const start = performance.now()
const samples = runScenario(scenario)
const { csv, html } = reportPaths(scenario.name, new Date())
mkdirSync(REPORTS_DIR, { recursive: true })
writeFileSync(csv, toCsv(samples))
writeFileSync(html, toReportHtml(scenario, samples))
const ms = Math.round(performance.now() - start)
console.log(
  `${scenario.name}: ${String(samples.length)} samples -> ${csv}, ${html} (${String(ms)} ms wall)`,
)
if (snapshot) console.log(`final state -> ${saveSnapshot(snapshot, finalState(scenario))}`)
