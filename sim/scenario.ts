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

// One lift of the relief valve: open and close in sim-seconds (close undefined while still open at the end), kg vented
export type Lift = { open: number; close?: number; vented: number }

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

// The last lift if an open valve continues it; undefined for a new lift, or a run from a snapshot taken mid-lift
function continuingLift(lifts: Lift[], wasOpen: boolean): Lift | undefined {
  const last = lifts.at(-1)
  return wasOpen && last?.close === undefined ? last : undefined
}

// Lifts so far after one tick from `before` to `after` that ran from `time`: a lift opens or closes within a tick,
// so lifts shorter than the sample interval are still recorded
export function trackLifts(lifts: Lift[], before: PowerPlantState, after: PowerPlantState, time: number): Lift[] {
  const [was, now] = [before.Boiler.reliefValveOpen, after.Boiler.reliefValveOpen]
  if (!was && !now) return lifts
  const continuing = continuingLift(lifts, was)
  const lift = continuing ?? { open: time, vented: 0 }
  const vented = lift.vented + after.Boiler.ventedTotal - before.Boiler.ventedTotal
  const updated: Lift = now ? { ...lift, vented } : { ...lift, vented, close: time }
  return [...lifts.filter((l) => l !== continuing), updated]
}

// Same path as the UI: operator actions and SIMULATE_TICK both go through the reducer.
// Hands each sample to `record`, each tick to `onTick`, and returns the state after the last tick.
function simulate(
  scenario: Scenario,
  record: (sample: Sample) => void,
  onTick: (before: PowerPlantState, after: PowerPlantState, time: number) => void = () => undefined,
): PowerPlantState {
  const { DeltaTime } = CstSimulation
  const { ticks, sampleTicks } = toTicks(scenario)
  const actionsAt = scheduleActions(scenario, ticks)

  let state = scenario.initial ?? initialPowerPlantState
  for (let tick = 0; tick < ticks; tick++) {
    state = actionsThisTick(scenario, actionsAt.get(tick), state, tick * DeltaTime)
    if (tick % sampleTicks === 0) record({ time: tick * DeltaTime, state })
    const before = state
    state = powerPlantReducer(state, { type: "SIMULATE_TICK" })
    onTick(before, state, tick * DeltaTime)
  }
  return state
}

export function runScenario(scenario: Scenario): Sample[] {
  return runScenarioWithLifts(scenario).samples
}

// One run: the samples, every relief valve lift (recorded per tick) and the state after the last tick
export type Run = { samples: Sample[]; lifts: Lift[]; final: PowerPlantState }

export function runScenarioWithLifts(scenario: Scenario): Run {
  const samples: Sample[] = []
  let lifts: Lift[] = []
  const final: PowerPlantState = simulate(
    scenario,
    (sample) => samples.push(sample),
    (before, after, time) => {
      lifts = trackLifts(lifts, before, after, time)
    },
  )
  return { samples, lifts, final }
}

// The plant state at the end of the run: what a snapshot of this scenario holds.
export function finalState(scenario: Scenario): PowerPlantState {
  return simulate(scenario, () => undefined)
}
