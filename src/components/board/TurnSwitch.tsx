/** Two-position turn switch for a control that holds a state (valve, pump, breaker). The label never changes: the legends name the two positions, and the selected one is lit like a lit lens button. An optional flip cover (the generator breaker) blocks the switch until it is lifted. Designed in the prototype of #124. */

import type { KeyboardEvent, MouseEvent } from "react"
import "./board.css"
import { tickAt } from "./switchGeometry"

type SwitchTone = "valve" | "machine" | "breaker"

type TurnSwitchGuard = {
  readonly lifted: boolean
  readonly onToggleCover: () => void
}

type TurnSwitchProps = {
  readonly label: string
  readonly offLabel: string
  readonly onLabel: string
  readonly on: boolean
  readonly onToggle: () => void
  readonly tone?: SwitchTone // the rim: brass for a valve, blue for a machine, red for the breaker
  readonly disabled?: boolean
  readonly title?: string // the reason a disabled switch refuses
  readonly guard?: TurnSwitchGuard // a flip cover over the switch
}

const SWING_DEG = 45 // either side of vertical
const MINOR_STEP_DEG = 12
const TICK_INNER = 41
const TICK_MAJOR_OUTER = 53
const TICK_MINOR_OUTER = 48
const PLATE_CENTRE_X = 80
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

type PlateProps = { readonly centreX: number; readonly text: string; readonly lit: boolean }

function Plate({ centreX, text, lit }: PlateProps) {
  return (
    <g className={lit ? "board-switch-plate board-switch-plate-lit" : "board-switch-plate"} data-lit={lit}>
      <rect x={centreX - PLATE_WIDTH / 2} y={PLATE_TOP} width={PLATE_WIDTH} height={PLATE_HEIGHT} rx={4} />
      <text x={centreX} y={PLATE_TOP + 16} textAnchor="middle">
        {text}
      </text>
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

export function TurnSwitch({
  label,
  offLabel,
  onLabel,
  on,
  onToggle,
  tone = "valve",
  disabled = false,
  title,
  guard,
}: TurnSwitchProps) {
  const covered: boolean = guard !== undefined && !guard.lifted
  const accessibleName: string = guard === undefined ? label : `${label}, cover ${covered ? "down" : "up"}`
  const press = (): void => {
    if (guard !== undefined && covered) {
      if (!disabled) guard.onToggleCover()
      return
    }
    if (!disabled) onToggle()
  }
  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>): void => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault()
      press()
    } else if (e.key === "Escape" && guard?.lifted === true) {
      e.preventDefault()
      guard.onToggleCover()
    }
  }
  return (
    <svg
      role="switch"
      aria-checked={on}
      aria-label={accessibleName}
      aria-disabled={disabled || undefined}
      tabIndex={0}
      viewBox="-120 -62 240 124"
      className={`board-switch board-switch-${tone}${disabled ? " board-switch-disabled" : ""}`}
      onClick={press}
      onKeyDown={onKeyDown}
    >
      {title !== undefined && <title>{title}</title>}
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
      <Plate centreX={-PLATE_CENTRE_X} text={offLabel} lit={!on} />
      <Plate centreX={PLATE_CENTRE_X} text={onLabel} lit={on} />
      <circle className="board-switch-rim" r={36} />
      <circle className="board-switch-cap" r={30} />
      <g className="board-switch-lever" style={{ transform: `rotate(${String(on ? SWING_DEG : -SWING_DEG)}deg)` }}>
        <path
          className="board-switch-grip"
          d="M -7 -35 L 7 -35 L 7 6 L 12 12 L 12 48 Q 0 58 -12 48 L -12 12 L -7 6 Z"
        />
        <rect className="board-switch-stripe" x={-2} y={-31} width={4} height={26} rx={2} />
        <circle className="board-switch-hub" r={7} />
      </g>
      {guard !== undefined && covered && <CoverDown />}
      {guard?.lifted === true && (
        <CoverUp
          onClick={(e: MouseEvent) => {
            e.stopPropagation()
            guard.onToggleCover()
          }}
        />
      )}
    </svg>
  )
}
