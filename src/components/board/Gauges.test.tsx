import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { LensButton } from "./LensButton"
import { Lamp } from "./Lamp"
import { LevelGauge } from "./LevelGauge"
import { RoundGauge } from "./RoundGauge"

describe("RoundGauge", () => {
  it("exposes its value and range as a meter and draws one arc per zone", () => {
    const { container } = render(
      <RoundGauge
        label="Pressure gauge"
        unit="bar"
        value={120}
        min={0}
        max={200}
        major={40}
        minor={10}
        zones={[
          { from: 0, to: 165, tone: "ok" },
          { from: 165, to: 200, tone: "alarm" },
        ]}
      />,
    )
    const meter: HTMLElement = screen.getByRole("meter", { name: "Pressure gauge" })
    expect(meter.getAttribute("aria-valuenow")).toBe("120")
    expect(meter.getAttribute("aria-valuemax")).toBe("200")
    expect(container.querySelectorAll("path[data-tone]").length).toBe(2)
  })
})

describe("LevelGauge", () => {
  it("exposes the level and one strip per zone", () => {
    const { container } = render(
      <LevelGauge label="Drum level gauge" value={35} zones={[{ from: 0, to: 20, tone: "alarm" }]} />,
    )
    expect(screen.getByRole("meter", { name: "Drum level gauge" }).getAttribute("aria-valuenow")).toBe("35")
    expect(container.querySelectorAll("rect[data-tone='alarm']").length).toBe(1)
  })
})

describe("Lamp", () => {
  it("says whether it is lit", () => {
    const { rerender } = render(<Lamp lit={false} label="Tripped" />)
    expect(screen.getByRole("img", { name: "Tripped: off" })).toBeTruthy()
    rerender(<Lamp lit label="Tripped" />)
    expect(screen.getByRole("img", { name: "Tripped: on" })).toBeTruthy()
  })
})

describe("LensButton", () => {
  it("is lit while pressed", () => {
    render(
      <LensButton pressed onClick={() => undefined}>
        Drain
      </LensButton>,
    )
    expect(screen.getByRole("button", { name: "Drain" }).classList.contains("board-lens-lit")).toBe(true)
  })
})
