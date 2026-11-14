/** Illuminated lens button; lit while pressed (aria-pressed) or when `lit` is set. Adapted from MC-v2 (Button). */

import type { ReactNode } from "react"
import "./board.css"

type LensButtonProps = {
  readonly children: ReactNode
  readonly onClick: () => void
  readonly pressed?: boolean
  readonly small?: boolean
  readonly disabled?: boolean
  readonly title?: string
  readonly "aria-label"?: string
  readonly "aria-expanded"?: boolean
  readonly "aria-controls"?: string
}

export function LensButton({
  children,
  onClick,
  pressed,
  small = false,
  disabled = false,
  title,
  "aria-label": ariaLabel,
  "aria-expanded": ariaExpanded,
  "aria-controls": ariaControls,
}: LensButtonProps) {
  const lit: boolean = pressed === true
  const className: string = [
    "board-lens",
    "board-lens-button",
    small ? "board-lens-small" : "",
    lit ? "board-lens-lit" : "",
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
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
