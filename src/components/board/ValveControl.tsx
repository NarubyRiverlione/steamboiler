/** Valve control: Close and Open lens buttons around a bar gauge, position on an LCD. Adapted from MC-v2 (Button, Display); replaces ValveSlider. */

import { Display } from "./Display"
import { Knob } from "./Knob"
import { LensButton } from "./LensButton"
import "./board.css"

type ValveControlProps = {
  readonly Label: string
  readonly Value?: string // flow rate
  readonly Position: number // 0..1, how much the valve is open
  readonly Step: number // percent per click
  readonly cbAdjust: (step: number) => void
  readonly knob?: boolean // a display-only knob between Close and Open instead of the bar (mockup of #41)
}

export function ValveControl({ Label, Value, Position, Step, cbAdjust, knob = false }: ValveControlProps) {
  const percent: number = Math.round(Position * 100)
  if (knob) {
    return (
      <div className="board-valve board-valve-knob">
        <span className="board-instrument-label">{Label}</span>
        <div className="board-valve-row">
          <LensButton
            small
            onClick={() => {
              cbAdjust(-Step / 100)
            }}
          >
            Close
          </LensButton>
          <Knob
            label={`${Label} knob`}
            value={percent}
            min={0}
            max={100}
            ends={["0", "100"]}
            note="MOCKUP"
            size={100}
          />
          <LensButton
            small
            onClick={() => {
              cbAdjust(Step / 100)
            }}
          >
            Open
          </LensButton>
        </div>
        <div className="board-valve-values">
          {Value !== undefined && <Display label={`${Label} flow`} text={Value} />}
          <Display label={`${Label} position`} text={`${String(percent)} % Open`} />
        </div>
      </div>
    )
  }
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
