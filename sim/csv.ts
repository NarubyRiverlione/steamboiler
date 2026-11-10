import PowerPlantState, { SpeedMode } from "../src/context/PowerPlantState"
import { Sample } from "./scenario"

// The speed mode as a number in the CSV: 0 Free, 1 Ramp up, 2 Hold
const speedModeCodes: SpeedMode[] = ["free", "rampUp", "hold"]
const toNumber = (value: number | boolean | SpeedMode): number =>
  typeof value === "boolean" ? Number(value) : typeof value === "string" ? speedModeCodes.indexOf(value) : value

function flatten(state: PowerPlantState): Record<string, number> {
  const row: Record<string, number> = {}
  const parts = { boiler: state.Boiler, turbine: state.Turbine, condenser: state.Condenser, deaerator: state.Deaerator, heater: state.Heater }
  for (const [prefix, part] of Object.entries(parts)) {
    for (const [key, value] of Object.entries(part)) {
      row[`${prefix}_${key}`] = toNumber(value)
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
