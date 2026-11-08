/** Illuminated lens button; lit while pressed (aria-pressed) or when `lit` is set. Adapted from MC-v2 (Button). */

import type { CSSProperties, ReactNode } from "react"
import "./board.css"

type LensButtonProps = {
  readonly children: ReactNode
  readonly onClick: () => void
  readonly pressed?: boolean
  readonly small?: boolean
  readonly disabled?: boolean
  readonly title?: string
  // The widest label this button can show; the button keeps that width so it does not resize as the label changes
  readonly widest?: string
}

export function LensButton({
  children,
  onClick,
  pressed,
  small = false,
  disabled = false,
  title,
  widest,
}: LensButtonProps) {
  const lit: boolean = pressed === true
  const className: string = [
    "board-lens",
    "board-lens-button",
    small ? "board-lens-small" : "",
    lit ? "board-lens-lit" : "",
    widest === undefined ? "" : "board-lens-fixed",
  ]
    .filter((c: string) => c !== "")
    .join(" ")
  return (
    <button
      type="button"
      className={className}
      aria-pressed={pressed}
      disabled={disabled}
      title={title}
      style={widest === undefined ? undefined : ({ "--board-lens-chars": widest.length } as CSSProperties)}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
