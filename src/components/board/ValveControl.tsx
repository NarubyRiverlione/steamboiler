/**
 * Valve control: a knob the operator turns (drag right to open, left to close; wheel and arrow keys too), with the
 * position and flow on LCDs. The knob sets an absolute position; useValveRamp dispatches it as steps toward the command
 * at 100 % per 5 real seconds (#41). The cap shows the command, a second pointer and the LCD show the actual position.
 */

import { Display } from "./Display"
import { Knob } from "./Knob"
import { roundTravel } from "./knobTravel"
import { useValveRamp } from "./useValveRamp"
import "./board.css"

type ValveControlProps = {
  readonly Label: string
  readonly Value?: string // flow rate
  readonly ValueWidest?: string // widest text of Value, so its LCD keeps its width
  readonly Position: number // 0..1, how much the valve is actually open
  readonly Step: number // percent per arrow key press or wheel notch
  readonly cbAdjust: (delta: number) => void // change of position as a fraction, the actions add it to the position
  readonly Caption?: string // visible heading of the knob, when it differs from Label
}

export function ValveControl({ Label, Value, ValueWidest, Position, Step, cbAdjust, Caption }: ValveControlProps) {
  const { commanded, command } = useValveRamp(Position, cbAdjust)
  const percent: number = Math.round(Position * 100)
  return (
    <div className="board-valve board-valve-knob">
      <span className="board-instrument-label">{Caption ?? Label}</span>
      <Knob
        label={`${Label} knob`}
        value={roundTravel((commanded ?? Position) * 100)}
        actual={roundTravel(Position * 100)}
        min={0}
        max={100}
        ends={["0", "100"]}
        step={Step}
        size={100}
        onChange={(value: number) => {
          command(value / 100)
        }}
      />
      <div className="board-valve-values">
        {Value !== undefined && <Display label={`${Label} flow`} text={Value} widest={ValueWidest} />}
        <Display label={`${Label} position`} text={`${String(percent)} % Open`} widest="100 % Open" />
      </div>
    </div>
  )
}
