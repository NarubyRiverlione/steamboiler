import { describe, expect, it } from "vitest"
import { fineStep, snapToStep } from "./fineStep"

describe("fineStep", () => {
  it("snaps an off-grid pump command, then moves one step", () => {
    expect(fineStep(6.4, 1, -1)).toBe(5)
    expect(fineStep(6.4, 1, 1)).toBe(7)
  })

  it("snaps an off-grid valve command, then moves one step", () => {
    expect(fineStep(6.4, 5, -1)).toBe(0)
    expect(fineStep(6.4, 5, 1)).toBe(10)
  })

  it("moves a command on the grid by one step", () => {
    expect(fineStep(50, 5, 1)).toBe(55)
    expect(fineStep(50, 5, -1)).toBe(45)
    expect(fineStep(30, 1, -1)).toBe(29)
  })

  it("rounds a .5 tie up before moving", () => {
    expect(snapToStep(6.5, 1)).toBe(7)
    expect(fineStep(6.5, 1, -1)).toBe(6)
    expect(fineStep(7.5, 5, 1)).toBe(15)
    expect(fineStep(2.5, 5, -1)).toBe(0)
  })

  it("clamps at both ends", () => {
    expect(fineStep(0, 5, -1)).toBe(0)
    expect(fineStep(100, 5, 1)).toBe(100)
    expect(fineStep(99.6, 1, 1)).toBe(100)
    expect(fineStep(0.4, 1, -1)).toBe(0)
    expect(snapToStep(103, 5)).toBe(100)
  })
})
