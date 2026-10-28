import { writeFileSync } from "node:fs"
import process from "node:process"
import { toCsv } from "./csv"
import { toReportHtml } from "./report"
import { runScenario } from "./scenario"
import { scenarios } from "./scenarios"

// usage: pnpm sim [scenario] [out.csv] [report.html]
const name = process.argv[2] ?? "startup-cold"
const out = process.argv[3] ?? "sim-out.csv"
const report = process.argv[4] ?? "report.html"
if (!Object.hasOwn(scenarios, name)) {
  console.error(`Unknown scenario "${name}". Available:`)
  for (const s of Object.values(scenarios)) console.error(`  ${s.name} — ${s.description}`)
  process.exit(1)
}
const scenario = scenarios[name]

const start = performance.now()
const samples = runScenario(scenario)
writeFileSync(out, toCsv(samples))
writeFileSync(report, toReportHtml(scenario, samples))
const ms = Math.round(performance.now() - start)
console.log(
  `${scenario.name}: ${String(samples.length)} samples -> ${out}, ${report} (${String(ms)} ms wall)`,
)
