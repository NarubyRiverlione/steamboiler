/** Rotary knob, display only for now (the gas knob of #15 will make it turn). Adapted from the full-board mockup (knob). */

import "./board.css"

type KnobProps = {
  readonly label: string
  readonly value: number
  readonly min: number
  readonly max: number
  readonly ends: readonly [string, string]
  readonly note?: string
}

const CX = 85
const CY = 85
const SWEEP_START = -135
const SWEEP_END = 135
const TICK_COUNT = 10
const GRIP_COUNT = 24

function polar(radius: number, deg: number): [number, number] {
  const rad: number = ((deg - 90) * Math.PI) / 180
  return [CX + radius * Math.cos(rad), CY + radius * Math.sin(rad)]
}

export function Knob({ label, value, min, max, ends, note }: KnobProps) {
  const clamped: number = Math.min(max, Math.max(min, value))
  const angle: number = SWEEP_START + ((SWEEP_END - SWEEP_START) * (clamped - min)) / (max - min)
  const ticks: number[] = Array.from({ length: TICK_COUNT + 1 }, (_: unknown, i: number) => i)
  const grips: number[] = Array.from({ length: GRIP_COUNT }, (_: unknown, i: number) => i)
  return (
    <svg
      className="board-knob"
      viewBox="0 0 170 170"
      width={150}
      height={150}
      role="meter"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={clamped}
    >
      {ticks.map((i: number) => {
        const deg: number = SWEEP_START + ((SWEEP_END - SWEEP_START) * i) / TICK_COUNT
        const [x1, y1]: [number, number] = polar(70, deg)
        const [x2, y2]: [number, number] = polar(78, deg)
        return (
          <line
            key={i}
            className={i % 5 === 0 ? "board-tick board-tick-major" : "board-tick"}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
          />
        )
      })}
      <text className="board-knob-end" x={34} y={158} textAnchor="middle">
        {ends[0]}
      </text>
      <text className="board-knob-end" x={136} y={158} textAnchor="middle">
        {ends[1]}
      </text>
      {note !== undefined && (
        <text className="board-knob-note" x={CX} y={158} textAnchor="middle">
          {note}
        </text>
      )}
      <circle className="board-knob-bezel" cx={CX} cy={CY} r={54} />
      <circle className="board-knob-well" cx={CX} cy={CY} r={46} />
      <g transform={`rotate(${angle.toFixed(2)} ${String(CX)} ${String(CY)})`}>
        <circle className="board-knob-cap" cx={CX} cy={CY} r={44} />
        {grips.map((i: number) => {
          const [x1, y1]: [number, number] = polar(40, i * 15)
          const [x2, y2]: [number, number] = polar(44, i * 15)
          return <line key={i} className="board-knob-grip" x1={x1} y1={y1} x2={x2} y2={y2} />
        })}
        <rect className="board-knob-pointer" x={CX - 3} y={CY - 40} width={6} height={24} rx={2} />
      </g>
    </svg>
  )
}
