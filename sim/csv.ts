import PowerPlantState from "../src/context/PowerPlantState"
import { Sample } from "./scenario"

function flatten(state: PowerPlantState): Record<string, number> {
  const row: Record<string, number> = {}
  const parts = { boiler: state.Boiler, turbine: state.Turbine, condenser: state.Condenser }
  for (const [prefix, part] of Object.entries(parts)) {
    for (const [key, value] of Object.entries(part)) {
      row[`${prefix}_${key}`] = typeof value === "boolean" ? Number(value) : value
    }
  }
  return row
}

export function toCsv(samples: Sample[]): string {
  if (samples.length === 0) return ""
  const rows = samples.map((s) => ({ time: s.time, ...flatten(s.state) }))
  const columns = Object.keys(rows[0])
  const lines = rows.map((r) => columns.map((c) => r[c as keyof typeof r]).join(","))
  return [columns.join(","), ...lines].join("\n") + "\n"
}
