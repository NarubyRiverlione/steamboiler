/** Board plate with an inset panel, a stencil title and four corner screws. Adapted from MC-v2 (PanelFrame). */

import type { ReactNode } from "react"
import "./board.css"

type PanelFrameProps = {
  readonly title: string
  readonly heading?: "h1" | "h2"
  readonly children?: ReactNode
}

// Fixed slot angle per corner: a hand-placed look that never changes between renders
const SCREWS = [
  { corner: "top-left", angle: 40 },
  { corner: "top-right", angle: 115 },
  { corner: "bottom-left", angle: 150 },
  { corner: "bottom-right", angle: 80 },
] as const

export function PanelFrame({ title, heading: Heading = "h2", children }: PanelFrameProps) {
  return (
    <section className="board-plate" aria-label={title}>
      {SCREWS.map(({ corner, angle }) => (
        <span
          key={corner}
          className={["board-screw", `board-screw-${corner}`].join(" ")}
          data-testid="screw"
          style={{ transform: `rotate(${String(angle)}deg)` }}
        />
      ))}
      <Heading className="board-title">{title}</Heading>
      <div className="board-panel">{children}</div>
    </section>
  )
}
