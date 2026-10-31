import { describe, expect, test } from "vitest"
import { invariants, totalWater } from "./invariants"
import { runScenario, Sample, Scenario } from "./scenario"
import { scenarios } from "./scenarios"
import { makeInitialState } from "../src/context/PowerPlantReducer"
import PowerPlantState from "../src/context/PowerPlantState"

// (scenario, invariant) pairs that fail today, with the ticket that fixes them. When that ticket
// lands the test.fails flips red: remove the entry so the pair guards as a normal test.
const expectedFailures: Record<string, string> = {
  "startup-cold / water is never created or lost": "#20",
  "turbine-start / water is never created or lost": "#20",
  "turbine-sync / water is never created or lost": "#20",
  "cooldown / natural cooldown never heats": "#12",
  "startup-cold / temperature within design temperature": "#43",
  "bypass-loop / water is never created or lost": "#34",
  "bypass-loop / no NaN or Infinity": "#22, #12",
  "bypass-loop / pressure within design pressure": "#22, #12",
  "bypass-loop / temperature within design temperature": "#22, #12",
  "bypass-loop / boiler water within capacity": "#22, #12",
  "bypass-loop / hotwell within capacity": "#22, #12",
  "bypass-loop / condensation pump return within pump capacity": "#22, #12",
}

describe.each(Object.values(scenarios))("$name invariants", (scenario: Scenario) => {
  const samples = runScenario(scenario)
  for (const invariant of invariants) {
    const ticket = expectedFailures[`${scenario.name} / ${invariant.name}`] as string | undefined
    if (ticket === undefined) test(invariant.name, () => { expect(invariant.check(samples)).toEqual([]); })
    else test.fails(`${invariant.name} (fails until ${ticket})`, () => { expect(invariant.check(samples)).toEqual([]); })
  }
})

describe("invariant checks", () => {
  const base = makeInitialState()
  const sample = (time: number, patch: (s: PowerPlantState) => PowerPlantState): Sample => ({
    time,
    state: patch(base),
  })
  const check = (name: string, samples: Sample[]) => {
    const invariant = invariants.find((i) => i.name === name)
    if (!invariant) throw new Error(`no invariant "${name}"`)
    return invariant.check(samples)
  }
  const boiler = (patch: Partial<PowerPlantState["Boiler"]>) => (s: PowerPlantState) => ({
    ...s,
    Boiler: { ...s.Boiler, ...patch },
  })

  test("a plain cold state violates nothing", () => {
    for (const invariant of invariants) expect(invariant.check([sample(0, (s) => s)])).toEqual([])
  })

  test("flags NaN and Infinity", () => {
    expect(check("no NaN or Infinity", [sample(0, boiler({ pressure: Infinity }))])).toHaveLength(1)
  })

  test("flags pressure and temperature above design", () => {
    expect(check("pressure within design pressure", [sample(0, boiler({ pressure: 181 }))])).toHaveLength(1)
    expect(
      check("temperature within design temperature", [sample(0, boiler({ temperature: 358 }))]),
    ).toHaveLength(1)
  })

  test("flags water outside capacity", () => {
    expect(check("boiler water within capacity", [sample(0, boiler({ waterVolume: -1 }))])).toHaveLength(1)
    expect(
      check("hotwell within capacity", [
        sample(0, (s) => ({ ...s, Condenser: { ...s.Condenser, hotwellWaterVolume: 1e9 } })),
      ]),
    ).toHaveLength(1)
  })

  test("flags a return outside 0..the pump volume of one tick", () => {
    const name = "condensation pump return within pump capacity"
    const returning = (returnRate: number) => (s: PowerPlantState) => ({ ...s, Condenser: { ...s.Condenser, returnRate } })
    // full pump: 300 l/s for one 0.1 s tick
    expect(check(name, [sample(0, returning(30))])).toEqual([])
    expect(check(name, [sample(0, returning(31))])).toHaveLength(1)
    expect(check(name, [sample(0, returning(-1))])).toHaveLength(1)
  })

  test("caps the violations listed", () => {
    const samples = Array.from({ length: 20 }, (_, i) => sample(i, boiler({ pressure: 200 })))
    expect(check("pressure within design pressure", samples)).toHaveLength(5)
  })

  describe("water is never created or lost", () => {
    const name = "water is never created or lost"
    const start = totalWater(base)

    test("flags water created", () => {
      expect(
        check(name, [sample(0, (s) => s), sample(10, boiler({ waterVolume: base.Boiler.waterVolume + 1000 }))]),
      ).toHaveLength(1)
    })

    test("allows 0.1% loss with no steam out, not more", () => {
      const lose = (kg: number) => boiler({ waterVolume: base.Boiler.waterVolume - kg })
      expect(check(name, [sample(0, (s) => s), sample(10, lose(start * 0.0009))])).toEqual([])
      expect(check(name, [sample(0, (s) => s), sample(10, lose(start * 0.002))])).toHaveLength(1)
    })

    test("counts makeup, reject and drain as boundary flows, not created or lost water", () => {
      const boundary = (s: PowerPlantState) => ({
        ...s,
        Boiler: { ...s.Boiler, waterVolume: s.Boiler.waterVolume - 300, drainedTotal: 300 },
        Condenser: {
          ...s.Condenser,
          hotwellWaterVolume: s.Condenser.hotwellWaterVolume + 1000 - 200,
          makeupTotal: 1000,
          rejectTotal: 200,
        },
      })
      expect(check(name, [sample(0, (s) => s), sample(10, boundary)])).toEqual([])
    })

    test("allows 2% of the steam that left the boiler", () => {
      const flowing = (s: PowerPlantState) => ({ ...s, Turbine: { ...s.Turbine, turbineSteamFlowOut: 100 } })
      // 100 kg/s for 10 s = 1000 kg out, so 20 kg (+0.1% of start) may go missing
      const lost = start * 0.001 + 15
      expect(
        check(name, [sample(0, flowing), sample(10, boiler({ waterVolume: base.Boiler.waterVolume - lost }))]),
      ).toEqual([])
    })
  })

  describe("natural cooldown", () => {
    const off = (time: number, patch: Partial<PowerPlantState["Boiler"]> = {}) =>
      sample(time, boiler({ gasFlow: 0, ...patch }))
    const on = (time: number, patch: Partial<PowerPlantState["Boiler"]> = {}) =>
      sample(time, boiler({ gasFlow: 1000, ...patch }))

    test("flags temperature or pressure rising while gas is off", () => {
      const name = "natural cooldown never heats"
      expect(check(name, [off(0, { temperature: 100 }), off(10, { temperature: 101 })])).toHaveLength(1)
      expect(check(name, [off(0, { pressure: 5 }), off(10, { pressure: 6 })])).toHaveLength(1)
    })

    test("ignores rises while gas is on", () => {
      expect(
        check("natural cooldown never heats", [on(0, { temperature: 100 }), on(10, { temperature: 101 })]),
      ).toEqual([])
    })

    test("allows steam generation for 120 s after gas reaches 0, not after", () => {
      const name = "natural cooldown stops steam generation"
      const steaming = (time: number) => off(time, { deltaSteamMass: 1 })
      expect(check(name, [on(0), steaming(10), steaming(129)])).toEqual([])
      expect(check(name, [on(0), steaming(10), steaming(130)])).toHaveLength(1)
    })
  })
})
