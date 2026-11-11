/** Vertical level gauge in percent with a coloured zone strip and a pointer. Adapted from MC-v2 / the full-board mockup (level). */

import "./board.css"
import type { GaugeZone } from "./RoundGauge"

type LevelGaugeProps = {
  readonly label: string
  readonly value: number // percent
  readonly zones?: readonly GaugeZone[]
  readonly ticks?: readonly number[]
  readonly target?: number // percent, a line across the glass at the level the vessel should hold
}

const TOP = 14
const BOTTOM = 176

export function LevelGauge({ label, value, zones = [], ticks = [0, 50, 100], target }: LevelGaugeProps) {
  const y = (p: number): number => BOTTOM - ((BOTTOM - TOP) * Math.min(100, Math.max(0, p))) / 100
  const level: number = y(value)
  return (
    <svg
      className="board-level"
      viewBox="0 0 96 190"
      width={96}
      height={190}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <rect className="board-level-housing" x={8} y={TOP - 8} width={52} height={BOTTOM - TOP + 16} rx={6} />
      <rect className="board-level-glass" x={18} y={TOP} width={32} height={BOTTOM - TOP} />
      <rect className="board-level-fill" x={19} y={level} width={30} height={Math.max(0, BOTTOM - level)} />
      {target !== undefined && (
        <line className="board-level-target" data-testid="level-target" x1={14} y1={y(target)} x2={54} y2={y(target)} />
      )}
      {zones.map((z: GaugeZone) => (
        <rect
          key={`${String(z.from)}-${String(z.to)}`}
          className={`board-zone-bar board-zone-${z.tone}`}
          data-tone={z.tone}
          x={64}
          y={y(z.to)}
          width={8}
          height={y(z.from) - y(z.to)}
        />
      ))}
      {ticks.map((t: number) => (
        <g key={t}>
          <line className="board-tick" x1={60} y1={y(t)} x2={76} y2={y(t)} />
          <text className="board-gauge-text board-level-tick" x={78} y={y(t) + 4}>
            {t}
          </text>
        </g>
      ))}
      <path className="board-pointer" d={`M62 ${String(level)} l-8 -5 v10 Z`} />
    </svg>
  )
}
