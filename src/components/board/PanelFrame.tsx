/** Board plate with an inset panel, a stencil title and four corner screws. Adapted from MC-v2 (PanelFrame). */

import type { ReactNode } from "react"
import { Screws } from "./Screws"
import "./board.css"

type PanelFrameProps = {
  readonly title: string
  readonly heading?: "h1" | "h2"
  readonly children?: ReactNode
}

export function PanelFrame({ title, heading: Heading = "h2", children }: PanelFrameProps) {
  return (
    <section className="board-plate" aria-label={title}>
      <Screws />
      <Heading className="board-title">{title}</Heading>
      <div className="board-panel">{children}</div>
    </section>
  )
}
