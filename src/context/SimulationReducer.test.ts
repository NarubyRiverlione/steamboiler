import { describe, expect, test } from "vitest"
import { activeAlarms, isSpeedLocked } from "./Alarms"
import { runTicks } from "./PowerPlantBatch"
import PowerPlantState from "./PowerPlantState"
import PowerPlantTick from "./PowerPlantTick"
import { makeInitialState, powerPlantReducer } from "./PowerPlantReducer"
import { SimulationAction, SimulationState, makeInitialSimulation, simulationReducer } from "./SimulationReducer"

const cold: PowerPlantState = makeInitialState()
// One tick away from a burner trip: gas on, water below the low-low level
const aboutToTrip = (): PowerPlantState => ({
  ...cold,
  Boiler: { ...cold.Boiler, gasFlow: 1000, waterMass: 1000, waterVolume: 1000 },
})
const sim = (patch: Partial<SimulationState> = {}): SimulationState => ({ ...makeInitialSimulation(cold), ...patch })
const act = (state: SimulationState, action: SimulationAction) => simulationReducer(state, action)

describe("batched ticks", () => {
  test("N batched ticks give exactly the state of N single ticks", () => {
    const start: PowerPlantState = powerPlantReducer(cold, { type: "INCREASE_GAS_FLOW", amount: 300 })
    let single: PowerPlantState = start
    for (let i = 0; i < 250; i++) single = PowerPlantTick(single)
    expect(runTicks(start, 250).state).toEqual(single)
    expect(powerPlantReducer(start, { type: "SIMULATE_TICKS", count: 250 })).toEqual(single)
  })

  test("splitting a run into batches changes nothing (a speed change causes no jump)", () => {
    const start: PowerPlantState = powerPlantReducer(cold, { type: "INCREASE_GAS_FLOW", amount: 300 })
    const split: PowerPlantState = [30, 10, 60, 1].reduce((s, n) => runTicks(s, n).state, start)
    expect(split).toEqual(runTicks(start, 101).state)
  })

  test("the clock counts the ticks run", () => {
    expect(act(sim(), { type: "SIMULATE_TICKS", count: 25 }).ticks).toBe(25)
  })
})

describe("alarms", () => {
  test("the batch stops on the tick where an alarm comes on, and the speed drops to 1x", () => {
    const start: SimulationState = sim({ plant: aboutToTrip(), speed: 60 })
    const next: SimulationState = act(start, { type: "SIMULATE_TICKS", count: 600 })
    expect(activeAlarms(next.plant)).toContain("burnerTrip")
    expect(next.ticks).toBeLessThan(600)
    expect(next.ticks).toBe(1)
    expect(next.speed).toBe(1)
    expect(next.unacknowledged).toContain("burnerTrip")
  })

  test("a pause stays a pause when an alarm comes on", () => {
    expect(act(sim({ plant: aboutToTrip(), speed: 0 }), { type: "SIMULATE_TICKS", count: 5 }).speed).toBe(0)
  })

  test("the speed cannot be raised while an alarm is unacknowledged, it can after ACK", () => {
    const tripped: SimulationState = act(sim({ plant: aboutToTrip(), speed: 60 }), { type: "SIMULATE_TICK" })
    expect(isSpeedLocked(tripped.plant, tripped.unacknowledged)).toBe(true)
    const refused: SimulationState = act(tripped, { type: "SET_PLAYBACK_SPEED", speed: 60 })
    expect(refused.speed).toBe(1)
    const acked: SimulationState = act(tripped, { type: "ACKNOWLEDGE_ALARMS" })
    expect(activeAlarms(acked.plant)).toContain("burnerTrip") // still set
    expect(act(acked, { type: "SET_PLAYBACK_SPEED", speed: 60 }).speed).toBe(60)
  })

  test("slowing down or pausing is allowed while locked", () => {
    const tripped: SimulationState = act(sim({ plant: aboutToTrip(), speed: 60 }), { type: "SIMULATE_TICK" })
    expect(act(tripped, { type: "SET_PLAYBACK_SPEED", speed: 0 }).speed).toBe(0)
  })

  test("an alarm that clears before ACK no longer locks the speed", () => {
    const tripped: SimulationState = act(sim({ plant: aboutToTrip(), speed: 60 }), { type: "SIMULATE_TICK" })
    const cleared: SimulationState = act({ ...tripped, plant: cold }, { type: "SIMULATE_TICK" })
    expect(cleared.unacknowledged).toEqual([])
    expect(act(cleared, { type: "SET_PLAYBACK_SPEED", speed: 10 }).speed).toBe(10)
  })

  test("the clock is not in PowerPlantState", () => {
    expect(Object.keys(sim().plant)).toEqual(["Boiler", "Condenser", "Turbine"])
  })
})
