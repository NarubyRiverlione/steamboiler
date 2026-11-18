/** Heavy breaker for a control that holds a state (#172): a cast body with a nameplate, a big position flag and a rocker handle in a recessed well, under the flip cover of ADR 0039. Same props as TurnSwitch, plus the nameplate text. Design: docs/research/2026-11-breaker-rocker-mockup.html. */

import "./board.css"
import { CoverDown, CoverStrip, Nameplate, PositionFlag, Rocker } from "./BreakerSwitchParts"
import { switchName, type SwitchGuard } from "./switchInput"
import { useSwitchInput } from "./useSwitchInput"

type BreakerSwitchProps = {
  readonly label: string
  readonly plate: string // the nameplate title, e.g. "Generator"
  readonly rating: string // dummy nameplate text, not modelled, e.g. "10.5 kV · CB-G1"
  readonly on: boolean
  readonly onToggle: () => void
  readonly disabled?: boolean // the breaker refuses to close; only the handle refuses, the cover still lifts
  readonly title?: string // the reason a disabled breaker refuses
  readonly guard?: SwitchGuard // the flip cover
}

export function BreakerSwitch({
  label,
  plate,
  rating,
  on,
  onToggle,
  disabled = false,
  title,
  guard,
}: BreakerSwitchProps) {
  const handlers = useSwitchInput({ disabled, guard, onToggle })
  const lifted: boolean = guard?.lifted === true
  const covered: boolean = guard !== undefined && !lifted
  const classes: string = ["board-breaker-well", disabled && !covered ? "board-breaker-well-disabled" : ""]
    .filter((c: string) => c !== "")
    .join(" ")
  return (
    <div className="board-breaker">
      <Nameplate plate={plate} rating={rating} />
      <PositionFlag on={on} refused={disabled} />
      <div
        role="switch"
        aria-checked={on}
        aria-label={switchName(label, guard)}
        aria-disabled={disabled || undefined}
        tabIndex={0}
        title={title}
        className={classes}
        {...handlers}
      >
        <Rocker on={on} />
        {covered && <CoverDown />}
      </div>
      {lifted && <CoverStrip onClick={() => guard?.onToggleCover()} />}
    </div>
  )
}
