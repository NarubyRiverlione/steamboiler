import { writeFileSync } from "node:fs"
import process from "node:process"
import { toCsv } from "./csv"
import { runScenario } from "./scenario"
import { scenarios } from "./scenarios"

// usage: pnpm sim [scenario] [out.csv]
const name = process.argv[2] ?? "startup-cold"
const out = process.argv[3] ?? "sim-out.csv"
if (!Object.hasOwn(scenarios, name)) {
  console.error(`Unknown scenario "${name}". Available:`)
  for (const s of Object.values(scenarios)) console.error(`  ${s.name} — ${s.description}`)
  process.exit(1)
}
const scenario = scenarios[name]

const start = performance.now()
const samples = runScenario(scenario)
writeFileSync(out, toCsv(samples))
const ms = Math.round(performance.now() - start)
console.log(`${scenario.name}: ${String(samples.length)} samples -> ${out} (${String(ms)} ms wall)`)
