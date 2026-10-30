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
  initial?: PowerPlantState // default: the cold plant; or loadSnapshot(name) to start mid-way
  actions: ScenarioAction[]
  // Feedback control: called every tick after the timed actions, its actions go through the reducer.
  // Must decide from state and time alone so runs stay reproducible.
  operator?: (state: PowerPlantState, time: number) => PowerPlantAction[]
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

const applyAll = (state: PowerPlantState, actions: PowerPlantAction[]) => actions.reduce(powerPlantReducer, state)

// Timed actions first, then whatever the operator decides on the resulting state
function actionsThisTick(
  scenario: Scenario,
  scheduled: PowerPlantAction[] | undefined,
  state: PowerPlantState,
  time: number,
): PowerPlantState {
  const afterTimed = applyAll(state, scheduled ?? [])
  return scenario.operator ? applyAll(afterTimed, scenario.operator(afterTimed, time)) : afterTimed
}

// Same path as the UI: operator actions and SIMULATE_TICK both go through the reducer.
// Hands each sample to `record` and returns the state after the last tick.
function simulate(scenario: Scenario, record: (sample: Sample) => void): PowerPlantState {
  const { DeltaTime } = CstSimulation
  const { ticks, sampleTicks } = toTicks(scenario)
  const actionsAt = scheduleActions(scenario, ticks)

  let state = scenario.initial ?? initialPowerPlantState
  for (let tick = 0; tick < ticks; tick++) {
    state = actionsThisTick(scenario, actionsAt.get(tick), state, tick * DeltaTime)
    if (tick % sampleTicks === 0) record({ time: tick * DeltaTime, state })
    state = powerPlantReducer(state, { type: "SIMULATE_TICK" })
  }
  return state
}

export function runScenario(scenario: Scenario): Sample[] {
  const samples: Sample[] = []
  simulate(scenario, (sample) => samples.push(sample))
  return samples
}

// The plant state at the end of the run: what a snapshot of this scenario holds.
export function finalState(scenario: Scenario): PowerPlantState {
  return simulate(scenario, () => undefined)
}
