import { describe, expect, test } from "vitest"
import { runChecked } from "../scenario-checks"
import { CloseAt, dieselOverload, OverloadAt, ReclosedAt } from "../scenarios/diesel-overload"

describe("diesel-overload", () => {
  const { samples } = runChecked(dieselOverload)
  const at = (time: number) => (samples.find((s) => s.time >= time) ?? samples[0]).state

  test("the diesel carries the start-up load before the overload", () => {
    expect(at(OverloadAt - 1).dieselBreaker).toBe(true)
    expect(at(OverloadAt - 1).Diesel.status).toBe("running")
  })

  test("goal: the pumps opened past the rating open the diesel breaker, the diesel keeps running", () => {
    const after = at(OverloadAt + 1)
    expect(CloseAt).toBeLessThan(OverloadAt)
    expect(after.dieselBreaker).toBe(false)
    expect(after.Diesel.status).toBe("running")
    expect(after.auxiliaryLoad).toBe(0)
  })

  test("a reclose with the load unchanged opens it again", () => {
    expect(at(ReclosedAt + 1).dieselBreaker).toBe(false)
    expect(samples[samples.length - 1].state.Diesel.status).toBe("running")
  })
})
