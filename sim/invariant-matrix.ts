/**
 * The invariant × scenario matrix: every invariant is a test on every scenario of a class. Used by the golden and the
 * edge invariant test files, so each layer checks its own scenarios.
 */
import { describe, expect, test } from "vitest"
import { invariants } from "./invariants"
import { runScenario, Scenario } from "./scenario"

// (scenario, invariant) pairs that fail today, with the ticket that fixes them. When that ticket
// lands the test.fails flips red: remove the entry so the pair guards as a normal test.
export const expectedFailures: Record<string, string> = {
  // a drum about 80% full of water holds a slowly rising steam inventory while it cools (+0.03 kg/s): the steam density
  // kink and the invariant's premise, see #46
  "relief-lift / natural cooldown stops steam generation": "#46",
  // the relief valve vents the boiler dry; the last litres cannot absorb the gas heat, the metal heats past design: #33
  "boiler-low / pressure within design pressure": "#33",
  "boiler-low / temperature within design temperature": "#33",
}

export function describeInvariants(scenarios: Scenario[]): void {
  describe.each(scenarios)("$name invariants", (scenario: Scenario) => {
    const samples = runScenario(scenario)
    for (const invariant of invariants) {
      const ticket = expectedFailures[`${scenario.name} / ${invariant.name}`] as string | undefined
      if (ticket === undefined)
        test(invariant.name, () => {
          expect(invariant.check(samples)).toEqual([])
        })
      else
        test.fails(`${invariant.name} (fails until ${ticket})`, () => {
          expect(invariant.check(samples)).toEqual([])
        })
    }
  })
}
