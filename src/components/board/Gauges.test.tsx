import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { LensButton } from "./LensButton"
import { Lamp } from "./Lamp"
import { LinearGauge } from "./LinearGauge"
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

describe("LinearGauge", () => {
  it("exposes the level and one strip per zone", () => {
    const { container } = render(
      <LinearGauge label="Drum level gauge" value={35} zones={[{ from: 0, to: 20, tone: "alarm" }]} />,
    )
    const meter: HTMLElement = screen.getByRole("meter", { name: "Drum level gauge" })
    expect(meter.getAttribute("aria-valuenow")).toBe("35")
    expect(meter.getAttribute("aria-valuemin")).toBe("0")
    expect(meter.getAttribute("aria-valuemax")).toBe("100")
    expect(container.querySelectorAll("rect[data-tone='alarm']").length).toBe(1)
  })

  it("stays vertical by default", () => {
    render(<LinearGauge label="Gauge" value={50} />)
    expect(screen.getByRole("meter").getAttribute("viewBox")).toBe("0 0 96 190")
  })

  it("reports the actual scale in aria values", () => {
    render(<LinearGauge label="Speed" value={1500} min={0} max={3300} orientation="horizontal" />)
    const meter: HTMLElement = screen.getByRole("meter", { name: "Speed" })
    expect(meter.getAttribute("aria-valuemin")).toBe("0")
    expect(meter.getAttribute("aria-valuemax")).toBe("3300")
    expect(meter.getAttribute("aria-valuenow")).toBe("1500")
    expect(meter.getAttribute("viewBox")).toBe("0 0 300 100")
  })

  it("places horizontal ticks left to right in scale units", () => {
    const { container } = render(
      <LinearGauge label="Speed" value={0} max={3300} orientation="horizontal" ticks={[0, 1650, 3300]} />,
    )
    const xs: number[] = Array.from(container.querySelectorAll("line.board-tick")).map((l: Element) =>
      Number(l.getAttribute("x1")),
    )
    expect(xs.length).toBe(3)
    expect(xs[0]).toBeLessThan(xs[1])
    expect(xs[1]).toBeLessThan(xs[2])
    expect(xs[1] - xs[0]).toBeCloseTo(xs[2] - xs[1])
    expect(container.querySelectorAll("text.board-gauge-text").length).toBe(3)
  })

  it("clamps the pointer inside the scale", () => {
    const { container, rerender } = render(<LinearGauge label="S" value={5000} max={3300} orientation="horizontal" />)
    const d1: string | null = container.querySelector("path.board-pointer")?.getAttribute("d") ?? null
    rerender(<LinearGauge label="S" value={3300} max={3300} orientation="horizontal" />)
    expect(container.querySelector("path.board-pointer")?.getAttribute("d")).toBe(d1)
  })

  it("draws a band at its position and keeps a very narrow band visible", () => {
    const { container } = render(
      <LinearGauge
        label="Speed"
        value={0}
        max={3300}
        orientation="horizontal"
        bands={[{ from: 2998, to: 3002 }]}
      />,
    )
    const band: Element = container.querySelectorAll("rect.board-level-band")[0]
    expect(Number(band.getAttribute("width"))).toBeGreaterThanOrEqual(3)
    const centre: number = Number(band.getAttribute("x")) + Number(band.getAttribute("width")) / 2
    const glass: Element = container.querySelectorAll("rect.board-level-glass")[0]
    const gx = Number(glass.getAttribute("x"))
    const gw = Number(glass.getAttribute("width"))
    expect(centre).toBeCloseTo(gx + (gw * 3000) / 3300)
  })

  it("draws a band on a vertical gauge too, and the target line", () => {
    const { container } = render(<LinearGauge label="L" value={10} bands={[{ from: 40, to: 60 }]} target={50} />)
    expect(container.querySelectorAll("rect.board-level-band").length).toBe(1)
    expect(container.querySelector("[data-testid='level-target']")).toBeTruthy()
  })

  it("maps a scale that does not start at zero", () => {
    const { container } = render(
      <LinearGauge label="S" value={50} min={50} max={150} orientation="horizontal" ticks={[50, 100, 150]} />,
    )
    const xs: number[] = Array.from(container.querySelectorAll("line.board-tick")).map((l: Element) =>
      Number(l.getAttribute("x1")),
    )
    expect(xs[1] - xs[0]).toBeCloseTo(xs[2] - xs[1])
    expect(screen.getByRole("meter").getAttribute("aria-valuemin")).toBe("50")
  })

  it("draws the target on a horizontal gauge", () => {
    const { container } = render(<LinearGauge label="L" value={10} orientation="horizontal" target={50} />)
    expect(container.querySelector("[data-testid='level-target']")).toBeTruthy()
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
