/** Two-position turn switch for a control that holds a state (valve, pump, breaker). The label never changes: the legends name the two positions, and the selected one is lit like a lit lens button. An optional flip cover (the generator breaker) blocks the switch until it is lifted. Designed in the prototype of #124. */

import "./board.css"
import { switchName, type SwitchGuard } from "./switchInput"
import { CoverLayer, Lever, Plate, PLATE_CENTRE_X, Ticks } from "./TurnSwitchParts"
import { useSwitchInput } from "./useSwitchInput"

type SwitchTone = "valve" | "machine" | "breaker"

type TurnSwitchProps = {
  readonly label: string
  readonly offLabel: string
  readonly onLabel: string
  readonly on: boolean
  readonly onToggle: () => void
  readonly tone?: SwitchTone // the rim: brass for a valve, blue for a machine, red for the breaker
  readonly disabled?: boolean
  readonly title?: string // the reason a disabled switch refuses
  readonly guard?: SwitchGuard // a flip cover over the switch
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
  const handlers = useSwitchInput({ disabled, guard, onToggle })
  const classes: string = ["board-switch", `board-switch-${tone}`, disabled ? "board-switch-disabled" : ""]
    .filter((c: string) => c !== "")
    .join(" ")
  return (
    <svg
      role="switch"
      aria-checked={on}
      aria-label={switchName(label, guard)}
      aria-disabled={disabled || undefined}
      tabIndex={0}
      viewBox="-120 -62 240 124"
      className={classes}
      {...handlers}
    >
      {title !== undefined && <title>{title}</title>}
      <Ticks />
      <Plate centreX={-PLATE_CENTRE_X} text={offLabel} lit={!on} />
      <Plate centreX={PLATE_CENTRE_X} text={onLabel} lit={on} />
      <circle className="board-switch-rim" r={36} />
      <circle className="board-switch-cap" r={30} />
      <Lever on={on} />
      <CoverLayer guard={guard} />
    </svg>
  )
}
