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
  // The first scenario to draw steam with the gas off: the draw flashes water, which the invariant's premise calls generation
  "low-pressure-close / natural cooldown stops steam generation": "#58",
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
