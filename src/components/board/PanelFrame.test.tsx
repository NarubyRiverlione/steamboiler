import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { PanelFrame } from "./PanelFrame"

const angles = (): string[] =>
  screen.getAllByTestId("screw").map((screw: HTMLElement) => screw.style.transform)

describe("PanelFrame", () => {
  it("shows the title and the content", () => {
    render(
      <PanelFrame title="Boiler">
        <p>content</p>
      </PanelFrame>,
    )
    expect(screen.getByRole("heading", { name: "Boiler" })).toBeTruthy()
    expect(screen.getByText("content")).toBeTruthy()
  })

  it("renders the title as the heading level asked for", () => {
    render(<PanelFrame title="Plant" heading="h1" />)
    expect(screen.getByRole("heading", { level: 1, name: "Plant" })).toBeTruthy()
  })

  it("draws four screws with stable angles across re-renders", () => {
    const { rerender } = render(<PanelFrame title="Boiler" />)
    const before: string[] = angles()
    expect(before).toHaveLength(4)
    rerender(<PanelFrame title="Boiler">more</PanelFrame>)
    expect(angles()).toEqual(before)
  })
})
