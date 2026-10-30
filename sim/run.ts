import { writeFileSync } from "node:fs"
import process from "node:process"
import { toCsv } from "./csv"
import { toReportHtml } from "./report"
import { finalState, runScenario } from "./scenario"
import { scenarios } from "./scenarios"
import { saveSnapshot } from "./snapshot"

// usage: pnpm sim [scenario] [out.csv] [report.html] [--snapshot name]
const args = process.argv.slice(2)
const flag = args.indexOf("--snapshot")
const snapshot = flag === -1 ? undefined : args.splice(flag, 2)[1]
if (flag !== -1 && !snapshot) {
  console.error("--snapshot needs a name")
  process.exit(1)
}
const name = args[0] ?? "startup-cold"
const out = args[1] ?? "sim-out.csv"
const report = args[2] ?? "report.html"
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
if (snapshot) console.log(`final state -> ${saveSnapshot(snapshot, finalState(scenario))}`)
