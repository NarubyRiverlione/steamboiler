/** LCD readout in the board's monospace font; red while its value is in alarm. Adapted from MC-v2 (Display). */

import "./board.css"

type DisplayProps = {
  readonly label: string
  readonly text: string
  readonly alarm?: boolean
}

export function Display({ label, text, alarm = false }: DisplayProps) {
  return (
    <output className={alarm ? "board-display board-display-alarm" : "board-display"} aria-label={label}>
      {text}
    </output>
  )
}
