import { CstSimulation } from "../src/context/const"
import PowerPlantAction from "../src/context/PowerPlantActions"
import PowerPlantState from "../src/context/PowerPlantState"
import { initialPowerPlantState, powerPlantReducer } from "../src/context/PowerPlantReducer"

export type ScenarioAction = { at: number; action: PowerPlantAction } // at: sim-seconds

export type Scenario = {
  name: string
  description: string
  duration: number // sim-seconds
  sampleEvery: number // sim-seconds
  initial?: PowerPlantState // default: the UI's warm start
  actions: ScenarioAction[]
}

export type Sample = { time: number; state: PowerPlantState }

// Sim-time of the first sample where the condition holds, or undefined if it never does.
export function firstTimeWhere(samples: Sample[], condition: (state: PowerPlantState) => boolean): number | undefined {
  return samples.find((s) => condition(s.state))?.time
}

const toTick = (seconds: number) => Math.round(seconds / CstSimulation.DeltaTime)

// Run length and sample interval in ticks; rejects scenarios that would record nothing.
function toTicks(scenario: Scenario): { ticks: number; sampleTicks: number } {
  const ticks = toTick(scenario.duration)
  const sampleTicks = toTick(scenario.sampleEvery)
  if (!(ticks > 0) || !(sampleTicks >= 1)) {
    throw new Error(
      `Scenario "${scenario.name}": duration and sampleEvery must be at least one tick (${String(CstSimulation.DeltaTime)} s)`,
    )
  }
  return { ticks, sampleTicks }
}

// Operator actions grouped by the tick they fire on, in scenario order.
function scheduleActions(scenario: Scenario, ticks: number): Map<number, PowerPlantAction[]> {
  const actionsAt = new Map<number, PowerPlantAction[]>()
  for (const { at, action } of scenario.actions) {
    const tick = toTick(at)
    if (tick < 0 || tick >= ticks)
      throw new Error(`Scenario "${scenario.name}": action at ${String(at)} s is outside the run`)
    actionsAt.set(tick, [...(actionsAt.get(tick) ?? []), action])
  }
  return actionsAt
}

// Same path as the UI: operator actions and SIMULATE_TICK both go through the reducer.
export function runScenario(scenario: Scenario): Sample[] {
  const { DeltaTime } = CstSimulation
  const { ticks, sampleTicks } = toTicks(scenario)
  const actionsAt = scheduleActions(scenario, ticks)

  let state = scenario.initial ?? initialPowerPlantState
  const samples: Sample[] = []
  for (let tick = 0; tick < ticks; tick++) {
    for (const action of actionsAt.get(tick) ?? []) state = powerPlantReducer(state, action)
    if (tick % sampleTicks === 0) samples.push({ time: tick * DeltaTime, state })
    state = powerPlantReducer(state, { type: "SIMULATE_TICK" })
  }
  return samples
}
