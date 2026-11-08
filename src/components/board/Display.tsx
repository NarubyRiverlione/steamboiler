/** LCD readout in the board's monospace font; red while its value is in alarm. Adapted from MC-v2 (Display). */

import type { CSSProperties } from "react"
import "./board.css"

type DisplayProps = {
  readonly label: string
  readonly text: string
  readonly alarm?: boolean
  // The widest text this readout can show; the box keeps that width so it does not resize as the text changes
  readonly widest?: string
}

export function Display({ label, text, alarm = false, widest }: DisplayProps) {
  const classes: string = [
    "board-display",
    alarm ? "board-display-alarm" : "",
    widest === undefined ? "" : "board-display-fixed",
  ]
    .filter((c: string) => c !== "")
    .join(" ")
  const style: CSSProperties | undefined =
    widest === undefined ? undefined : ({ "--board-display-chars": widest.length } as CSSProperties)
  return (
    <output className={classes} aria-label={label} style={style}>
      {text}
    </output>
  )
}
