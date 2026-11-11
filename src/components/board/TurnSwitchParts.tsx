/** The drawn parts of a turn switch (#124): tick marks, lens-plate legends, the lever and the flip cover. */

import type { MouseEvent } from "react"
import { tickAt } from "./switchGeometry"
import type { SwitchGuard } from "./switchInput"

export const SWING_DEG = 45 // either side of vertical
const MINOR_STEP_DEG = 12
const TICK_INNER = 41
const TICK_MAJOR_OUTER = 53
const TICK_MINOR_OUTER = 48
export const PLATE_CENTRE_X = 80
const PLATE_WIDTH = 66
const PLATE_HEIGHT = 24
const PLATE_TOP = -52

const TICK_ANGLES: readonly number[] = [
  -SWING_DEG - MINOR_STEP_DEG,
  -SWING_DEG,
  -SWING_DEG + MINOR_STEP_DEG,
  SWING_DEG - MINOR_STEP_DEG,
  SWING_DEG,
  SWING_DEG + MINOR_STEP_DEG,
]

export function Ticks() {
  return (
    <>
      {TICK_ANGLES.map((deg: number) => {
        const major: boolean = Math.abs(deg) === SWING_DEG
        return (
          <line
            key={deg}
            className={major ? "board-switch-tick board-switch-tick-major" : "board-switch-tick"}
            {...tickAt(deg, TICK_INNER, major ? TICK_MAJOR_OUTER : TICK_MINOR_OUTER)}
          />
        )
      })}
    </>
  )
}

type PlateProps = { readonly centreX: number; readonly text: string; readonly lit: boolean }

export function Plate({ centreX, text, lit }: PlateProps) {
  return (
    <g className={lit ? "board-switch-plate board-switch-plate-lit" : "board-switch-plate"} data-lit={lit}>
      <rect x={centreX - PLATE_WIDTH / 2} y={PLATE_TOP} width={PLATE_WIDTH} height={PLATE_HEIGHT} rx={4} />
      <text x={centreX} y={PLATE_TOP + 16} textAnchor="middle">
        {text}
      </text>
    </g>
  )
}

export function Lever({ on }: { readonly on: boolean }) {
  const angle: number = on ? SWING_DEG : -SWING_DEG
  return (
    <g className="board-switch-lever" style={{ transform: `rotate(${String(angle)}deg)` }}>
      <path
        className="board-switch-grip"
        d="M -7 -35 L 7 -35 L 7 6 L 12 12 L 12 48 Q 0 58 -12 48 L -12 12 L -7 6 Z"
      />
      <rect className="board-switch-stripe" x={-2} y={-31} width={4} height={26} rx={2} />
      <circle className="board-switch-hub" r={7} />
    </g>
  )
}

function CoverDown() {
  return (
    <g className="board-switch-cover">
      <rect x={-46} y={-58} width={92} height={116} rx={8} />
      <path className="board-switch-cover-shine" d="M -40 -52 L 40 -52 L 14 -30 L -40 -30 Z" />
      <rect className="board-switch-cover-tab" x={-18} y={-62} width={36} height={8} rx={3} />
      <circle className="board-switch-cover-hinge" cx={-36} cy={58} r={4} />
      <circle className="board-switch-cover-hinge" cx={36} cy={58} r={4} />
      <text x={0} y={52} textAnchor="middle">
        LIFT COVER
      </text>
    </g>
  )
}

function CoverUp({ onClick }: { readonly onClick: (e: MouseEvent) => void }) {
  return (
    <g className="board-switch-cover board-switch-cover-up" onClick={onClick}>
      <rect x={-46} y={46} width={92} height={12} rx={3} />
      <text x={0} y={56} textAnchor="middle">
        COVER UP
      </text>
    </g>
  )
}

// Nothing without a guard; the cover face while it is down; a strip that drops it again while it is up
export function CoverLayer({ guard }: { readonly guard: SwitchGuard | undefined }) {
  if (guard === undefined) return null
  if (!guard.lifted) return <CoverDown />
  return (
    <CoverUp
      onClick={(e: MouseEvent) => {
        e.stopPropagation()
        guard.onToggleCover()
      }}
    />
  )
}
