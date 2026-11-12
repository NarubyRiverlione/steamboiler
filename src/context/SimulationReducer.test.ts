import { describe, expect, test } from "vitest"
import { activeAlarms } from "./Alarms"
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
    const start: PowerPlantState = powerPlantReducer(cold, { type: "SET_GAS_RATE", payload: { gasRateCommand: 0.3 } })
    let single: PowerPlantState = start
    for (let i = 0; i < 100; i++) single = PowerPlantTick(single)
    expect(runTicks(start, 100).state).toEqual(single)
    expect(powerPlantReducer(start, { type: "SIMULATE_TICKS", count: 100 })).toEqual(single)
  })

  test("splitting a run into batches changes nothing (a speed change causes no jump)", () => {
    const start: PowerPlantState = powerPlantReducer(cold, { type: "SET_GAS_RATE", payload: { gasRateCommand: 0.3 } })
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
    expect(activeAlarms(next.plant)).toContain("burnerTripped")
    expect(next.ticks).toBeLessThan(600)
    expect(next.ticks).toBe(1)
    expect(next.speed).toBe(1)
      })

  test("a pause stays a pause when an alarm comes on", () => {
    expect(act(sim({ plant: aboutToTrip(), speed: 0 }), { type: "SIMULATE_TICKS", count: 5 }).speed).toBe(0)
  })

  test("an alarm already set does not drop the speed again", () => {
    const tripped: SimulationState = act(sim({ plant: aboutToTrip(), speed: 60 }), { type: "SIMULATE_TICK" })
    const raised: SimulationState = act({ ...tripped, speed: 60 }, { type: "SIMULATE_TICKS", count: 3 })
    expect(raised.speed).toBe(60)
  })

  test("loading a preset resets the clock to zero and the speed to 1x, without counting its alarms as new", () => {
    const running: SimulationState = sim({ ticks: 500, speed: 60 })
    const loaded: SimulationState = act(running, { type: "LOAD_STATE", payload: { state: aboutToTrip() } })
    expect(loaded.ticks).toBe(0)
    expect(loaded.speed).toBe(1)
    expect(loaded.plant).toEqual(aboutToTrip())
  })

  test("an operator action goes to the plant and leaves clock and speed alone", () => {
    const next: SimulationState = act(sim({ ticks: 7, speed: 10 }), { type: "TOGGLE_DRAIN_VALVE" })
    expect(next.plant.Boiler.drainValveOpen).toBe(true)
    expect(next.ticks).toBe(7)
    expect(next.speed).toBe(10)
  })

  test("any speed can be set, a pause stays a pause", () => {
    expect(act(sim(), { type: "SET_PLAYBACK_SPEED", speed: 0 }).speed).toBe(0)
  })

  test("the clock is not in PowerPlantState", () => {
    expect(Object.keys(sim().plant)).not.toHaveProperty("ticks")
  })
})
