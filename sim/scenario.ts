import { CstSimulation } from "../src/context/const"
import PowerPlantAction from "../src/context/PowerPlantActions"
import PowerPlantState from "../src/context/PowerPlantState"
import { initialPowerPlantState, powerPlantReducer } from "../src/context/PowerPlantReducer"

export type Scenario = {
  name: string
  description: string
  duration: number // sim-seconds
  sampleEvery: number // sim-seconds
  initial?: PowerPlantState // default: the UI's warm start
  actions: { at: number; action: PowerPlantAction }[] // at: sim-seconds
}

export type Sample = { time: number; state: PowerPlantState }

// Sim-time of the first sample where the condition holds, or undefined if it never does.
export function firstTimeWhere(samples: Sample[], condition: (state: PowerPlantState) => boolean): number | undefined {
  return samples.find((s) => condition(s.state))?.time
}

// Same path as the UI: operator actions and SIMULATE_TICK both go through the reducer.
export function runScenario(scenario: Scenario): Sample[] {
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

  let state = scenario.initial ?? initialPowerPlantState
  const samples: Sample[] = []
  for (let tick = 0; tick < ticks; tick++) {
    for (const action of actionsAt.get(tick) ?? []) state = powerPlantReducer(state, action)
    if (tick % sampleTicks === 0) samples.push({ time: tick * DeltaTime, state })
    state = powerPlantReducer(state, { type: "SIMULATE_TICK" })
  }
  return samples
}
