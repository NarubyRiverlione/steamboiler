/** Round bezel LED inside an SVG; red while lit. Adapted from MC-v2 (Led). */

import "./board.css"

type LedProps = {
  readonly lit: boolean
  readonly label: string
}

export function Led({ lit, label }: LedProps) {
  return (
    <g role="img" aria-label={lit ? label + ": on" : label + ": off"} data-lit={lit}>
      <circle className="board-led-bezel" r={13} />
      <circle className={lit ? "board-led board-led-lit" : "board-led"} r={9} />
    </g>
  )
}
