/**
 * Valve control: a knob the operator turns (drag right to open, left to close; wheel and arrow keys too), with the
 * position and flow on LCDs. The knob sets an absolute position; the ValveRampProvider dispatches it as steps toward the
 * command at 100 % per 15 real seconds (#41), also while another page is shown (#127). The cap shows the command,
 * a second pointer and the LCD show the actual position.
 */

import { Display } from "./Display"
import { fineStep, MAX_PERCENT, MIN_PERCENT } from "./fineStep"
import { Knob } from "./Knob"
import { LensButton } from "./LensButton"
import { roundTravel } from "./knobTravel"
import { useValveRamp, type ValveId } from "./valveRampContext"
import "./board.css"

type ValveControlProps = {
  readonly ValveId: ValveId // stable, unique key of this valve; the ramp is kept under it while the page is unmounted
  readonly Label: string
  readonly Value?: string // flow rate; with a flow the position LCD is left out, the position is the knob's blue marker
  readonly ValueWidest?: string // widest text of Value, so its LCD keeps its width
  readonly Position: number // 0..1, how much the valve is actually open
  readonly Step: number // percent per arrow key press or wheel notch
  readonly Pump?: boolean // a pump knob has its own cap tint
  readonly Caption?: string // visible heading of the knob, when it differs from Label
  readonly Disabled?: string // the reason the operator cannot move the valve (the plant moves it): the knob turns display-only, the buttons disabled, the reason shown
}

export function ValveControl({
  ValveId,
  Label,
  Value,
  ValueWidest,
  Position,
  Step,
  Caption,
  Disabled,
  Pump = false,
}: ValveControlProps) {
  const { commanded, command } = useValveRamp(ValveId)
  const locked: boolean = Disabled !== undefined
  const percent: number = Math.round(Position * 100)
  const commandPercent: number = roundTravel((commanded ?? Position) * 100)
  const nudge = (direction: 1 | -1): void => {
    command(fineStep(commandPercent, Step, direction) / 100)
  }
  return (
    <div className="board-valve board-valve-knob">
      <span className="board-instrument-label">{Caption ?? Label}</span>
      <div className="board-valve-knob-row">
        <LensButton
          small
          aria-label={`${Label} knob decrease`}
          disabled={locked || commandPercent <= MIN_PERCENT}
          title={Disabled}
          onClick={() => {
            nudge(-1)
          }}
        >
          −
        </LensButton>
        <Knob
          label={`${Label} knob`}
          value={commandPercent}
          actual={roundTravel(Position * 100)}
          min={0}
          max={100}
          ends={["0", "100"]}
          step={Step}
          size={100}
          tone={Pump ? "pump" : "valve"}
          onChange={
            locked
              ? undefined
              : (value: number) => {
                  command(value / 100)
                }
          }
        />
        <LensButton
          small
          aria-label={`${Label} knob increase`}
          disabled={locked || commandPercent >= MAX_PERCENT}
          title={Disabled}
          onClick={() => {
            nudge(1)
          }}
        >
          +
        </LensButton>
      </div>
      {locked && <span className="board-valve-reason">{Disabled}</span>}
      <div className="board-valve-values">
        {Value !== undefined && <Display label={`${Label} flow`} text={Value} widest={ValueWidest} />}
        {Value === undefined && (
          <Display label={`${Label} position`} text={`${String(percent)} % Open`} widest="100 % Open" />
        )}
      </div>
    </div>
  )
}
