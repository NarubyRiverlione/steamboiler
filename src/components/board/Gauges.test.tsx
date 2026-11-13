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
    expect(meter.getAttribute("viewBox")).toBe("0 0 320 96")
  })

  it("places horizontal ticks left to right in scale units", () => {
    const { container } = render(
      <LinearGauge label="Speed" value={0} max={3300} orientation="horizontal" ticks={[0, 1650, 3300]} />,
    )
    const xs: number[] = Array.from(container.querySelectorAll("line.board-tick"))
      .slice(1)
      .map((l: Element) => Number(l.getAttribute("x1")))
    expect(xs.length).toBe(3)
    expect(xs[0]).toBeLessThan(xs[1])
    expect(xs[1]).toBeLessThan(xs[2])
    expect(xs[1] - xs[0]).toBeCloseTo(xs[2] - xs[1])
    expect(container.querySelectorAll("text.board-gauge-text").length).toBe(3)
  })

  it("clamps the pointer inside the scale", () => {
    const { container, rerender } = render(
      <LinearGauge label="S" value={5000} max={3300} orientation="horizontal" />,
    )
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
        ticks={[0, 3300]}
        bands={[{ from: 2998, to: 3002 }]}
      />,
    )
    const band: Element = container.querySelectorAll("rect.board-level-band")[0]
    expect(Number(band.getAttribute("width"))).toBeGreaterThanOrEqual(3)
    const centre: number = Number(band.getAttribute("x")) + Number(band.getAttribute("width")) / 2
    const [x0, x1]: number[] = Array.from(container.querySelectorAll("line.board-tick"))
      .slice(1)
      .map((l: Element) => Number(l.getAttribute("x1")))
    expect(centre).toBeCloseTo(x0 + ((x1 - x0) * 3000) / 3300)
  })

  it("draws a horizontal meter: no glass or fill, even major and minor ticks, labels on the majors", () => {
    const { container } = render(
      <LinearGauge
        label="Speed"
        value={1500}
        max={3300}
        orientation="horizontal"
        unit="rpm"
        major={500}
        minor={100}
      />,
    )
    expect(container.querySelector("rect.board-level-glass")).toBeNull()
    expect(container.querySelector("rect.board-level-fill")).toBeNull()
    const labels: string[] = Array.from(container.querySelectorAll("text.board-gauge-text")).map(
      (t: Element) => t.textContent ?? "",
    )
    expect(labels).toEqual(["0", "500", "1000", "1500", "2000", "2500", "3000", "rpm"])
    // 34 ticks (0 to 3300 every 100) plus the scale baseline
    expect(container.querySelectorAll("line.board-tick").length).toBe(35)
  })

  it("labels only the major ticks of a vertical gauge with major and minor", () => {
    const { container } = render(<LinearGauge label="L" value={10} major={50} minor={10} />)
    expect(container.querySelectorAll("line.board-tick").length).toBe(11)
    expect(container.querySelectorAll("text.board-gauge-text").length).toBe(3)
  })

  it("draws a band on a vertical gauge too, and the target line", () => {
    const { container } = render(
      <LinearGauge label="L" value={10} bands={[{ from: 40, to: 60 }]} target={50} />,
    )
    expect(container.querySelectorAll("rect.board-level-band").length).toBe(1)
    expect(container.querySelector("[data-testid='level-target']")).toBeTruthy()
  })

  it("maps a scale that does not start at zero", () => {
    const { container } = render(
      <LinearGauge label="S" value={50} min={50} max={150} orientation="horizontal" ticks={[50, 100, 150]} />,
    )
    const xs: number[] = Array.from(container.querySelectorAll("line.board-tick"))
      .slice(1)
      .map((l: Element) => Number(l.getAttribute("x1")))
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
