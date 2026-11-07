/** Four corner screws at fixed angles, for a plate. Adapted from MC-v2 (PanelFrame). */

import "./board.css"

// Fixed slot angle per corner: a hand-placed look that never changes between renders
const SCREWS = [
  { corner: "top-left", angle: 40 },
  { corner: "top-right", angle: 115 },
  { corner: "bottom-left", angle: 150 },
  { corner: "bottom-right", angle: 80 },
] as const

export function Screws() {
  return SCREWS.map(({ corner, angle }) => (
    <span
      key={corner}
      className={["board-screw", `board-screw-${corner}`].join(" ")}
      data-testid="screw"
      style={{ transform: `rotate(${String(angle)}deg)` }}
    />
  ))
}
