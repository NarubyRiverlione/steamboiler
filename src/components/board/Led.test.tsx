import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Led } from "./Led"

const renderLed = (lit: boolean): void => {
  render(
    <svg>
      <Led lit={lit} label="Boiler alarm" />
    </svg>,
  )
}

describe("Led", () => {
  it("reports itself on when lit", () => {
    renderLed(true)
    expect(screen.getByRole("img", { name: "Boiler alarm: on" })).toBeTruthy()
  })

  it("reports itself off when not lit", () => {
    renderLed(false)
    expect(screen.getByRole("img", { name: "Boiler alarm: off" })).toBeTruthy()
  })
})
