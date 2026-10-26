import { CstSimulation } from "../src/context/const"
import PowerPlantAction from "../src/context/PowerPlantActions"
import PowerPlantState from "../src/context/PowerPlantState"
import { initialPowerPlantState, powerPlantReducer } from "../src/context/PowerPlantReducer"

export type Scenario = {
  name: string
  duration: number // sim-seconds
  sampleEvery: number // sim-seconds
  actions: { at: number; action: PowerPlantAction }[] // at: sim-seconds
}

export type Sample = { time: number; state: PowerPlantState }

// Same path as the UI: operator actions and SIMULATE_TICK both go through the reducer.
export function runScenario(scenario: Scenario, initial: PowerPlantState = initialPowerPlantState): Sample[] {
  const { DeltaTime } = CstSimulation
  const ticks = Math.round(scenario.duration / DeltaTime)
  const sampleTicks = Math.round(scenario.sampleEvery / DeltaTime)
  if (!(ticks > 0) || !(sampleTicks >= 1)) {
    throw new Error(
      `Scenario "${scenario.name}": duration and sampleEvery must be at least one tick (${String(DeltaTime)} s)`,
    )
  }
  const actionsAt = new Map<number, PowerPlantAction[]>()
  for (const { at, action } of scenario.actions) {
    const tick = Math.round(at / DeltaTime)
    if (tick < 0 || tick >= ticks)
      throw new Error(`Scenario "${scenario.name}": action at ${String(at)} s is outside the run`)
    actionsAt.set(tick, [...(actionsAt.get(tick) ?? []), action])
  }

  let state = initial
  const samples: Sample[] = []
  for (let tick = 0; tick < ticks; tick++) {
    for (const action of actionsAt.get(tick) ?? []) state = powerPlantReducer(state, action)
    if (tick % sampleTicks === 0) samples.push({ time: tick * DeltaTime, state })
    state = powerPlantReducer(state, { type: "SIMULATE_TICK" })
  }
  return samples
}

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
