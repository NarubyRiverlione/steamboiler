/** Valve control: Close and Open lens buttons around a bar gauge, position on an LCD. Adapted from MC-v2 (Button, Display); replaces ValveSlider. */

import { Display } from "./Display"
import { LensButton } from "./LensButton"
import "./board.css"

type ValveControlProps = {
  readonly Label: string
  readonly Value?: string // flow rate
  readonly Position: number // 0..1, how much the valve is open
  readonly Step: number // percent per click
  readonly cbAdjust: (step: number) => void
}

export function ValveControl({ Label, Value, Position, Step, cbAdjust }: ValveControlProps) {
  const percent: number = Math.round(Position * 100)
  return (
    <div className="board-valve">
      <div className="board-valve-head">
        <span className="board-valve-label">{Label}</span>
        <div className="board-valve-values">
          {Value !== undefined && <Display label={`${Label} flow`} text={Value} />}
          <Display label={`${Label} position`} text={`${String(percent)} % Open`} />
        </div>
      </div>
      <div className="board-valve-row">
        <LensButton
          small
          onClick={() => {
            cbAdjust(-Step / 100)
          }}
        >
          Close
        </LensButton>
        <div
          className="board-valve-bar"
          role="meter"
          aria-label={`${Label} bar`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="board-valve-bar-fill" style={{ width: `${String(percent)}%` }} />
        </div>
        <LensButton
          small
          onClick={() => {
            cbAdjust(Step / 100)
          }}
        >
          Open
        </LensButton>
      </div>
    </div>
  )
}
