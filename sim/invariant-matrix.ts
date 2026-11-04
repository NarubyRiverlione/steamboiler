/**
 * The invariant × scenario matrix: every invariant is a test on every scenario of a class. Used by the golden and the
 * edge invariant test files, so each layer checks its own scenarios.
 */
import { describe, expect, test } from "vitest"
import { invariants } from "./invariants"
import { runScenario, Scenario } from "./scenario"

// (scenario, invariant) pairs that fail today, with the ticket that fixes them. When that ticket
// lands the test.fails flips red: remove the entry so the pair guards as a normal test.
// Empty since the 35% cold fill (#65) made the one entry, relief-lift / natural cooldown (#46), pass
export const expectedFailures: Record<string, string> = {}

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
