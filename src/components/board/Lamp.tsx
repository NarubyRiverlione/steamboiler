/** Bezel LED with a text label for use in HTML (wraps Led in its own SVG). */

import { Led } from "./Led"
import "./board.css"

type LampProps = {
  readonly lit: boolean
  readonly label: string
  readonly title?: string
}

export function Lamp({ lit, label, title }: LampProps) {
  return (
    <span className="board-lamp" title={title}>
      <svg width={26} height={26} viewBox="-13 -13 26 26">
        <Led lit={lit} label={label} />
      </svg>
      <span className="board-lamp-label">{label}</span>
    </span>
  )
}
