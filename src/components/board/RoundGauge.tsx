/** Round dial gauge with coloured zones and a needle. Adapted from MC-v2 / the full-board mockup (gauge). */

import "./board.css"

export type GaugeZone = { readonly from: number; readonly to: number; readonly tone: "neutral" | "ok" | "warn" | "alarm" }

type RoundGaugeProps = {
  readonly label: string
  readonly unit: string
  readonly value: number
  readonly min: number
  readonly max: number
  readonly major: number
  readonly minor: number
  readonly zones?: readonly GaugeZone[]
}

const CX = 105
const CY = 100
const SWEEP_START = -135
const SWEEP_END = 135

function polar(radius: number, deg: number): [number, number] {
  const rad: number = ((deg - 90) * Math.PI) / 180
  return [CX + radius * Math.cos(rad), CY + radius * Math.sin(rad)]
}

function arc(radius: number, from: number, to: number): string {
  const [x1, y1]: [number, number] = polar(radius, from)
  const [x2, y2]: [number, number] = polar(radius, to)
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${String(radius)} ${String(radius)} 0 ${to - from > 180 ? "1" : "0"} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

export function RoundGauge({ label, unit, value, min, max, major, minor, zones = [] }: RoundGaugeProps) {
  const angle = (v: number): number =>
    SWEEP_START + ((SWEEP_END - SWEEP_START) * (Math.min(max, Math.max(min, v)) - min)) / (max - min)
  const ticks: number[] = []
  for (let v: number = min; v <= max + 1e-9; v += minor) ticks.push(v)
  const isMajor = (v: number): boolean => Math.abs((v - min) / major - Math.round((v - min) / major)) < 1e-6

  return (
    <svg
      className="board-gauge"
      viewBox="0 0 210 200"
      width={210}
      height={200}
      role="meter"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <circle className="board-gauge-bezel" cx={CX} cy={CY} r={92} />
      <circle className="board-gauge-face" cx={CX} cy={CY} r={84} />
      {zones.map((z: GaugeZone) => (
        <path
          key={`${String(z.from)}-${String(z.to)}`}
          className={`board-zone board-zone-${z.tone}`}
          d={arc(70, angle(z.from), angle(z.to))}
          data-tone={z.tone}
        />
      ))}
      {ticks.map((v: number) => {
        const [x1, y1]: [number, number] = polar(isMajor(v) ? 60 : 64, angle(v))
        const [x2, y2]: [number, number] = polar(74, angle(v))
        const [tx, ty]: [number, number] = polar(47, angle(v))
        return (
          <g key={v}>
            <line
              className={isMajor(v) ? "board-tick board-tick-major" : "board-tick"}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
            />
            {isMajor(v) && (
              <text className="board-gauge-text" x={tx} y={ty + 4}>
                {Math.round(v)}
              </text>
            )}
          </g>
        )
      })}
      <text className="board-gauge-text board-gauge-unit" x={CX} y={CY + 40}>
        {unit}
      </text>
      <g className="board-needle" transform={`rotate(${String(angle(value))} ${String(CX)} ${String(CY)})`}>
        <path
          d={`M${String(CX - 3)} ${String(CY + 14)} L${String(CX)} ${String(CY - 72)} L${String(CX + 3)} ${String(CY + 14)} Z`}
        />
      </g>
      <circle className="board-hub" cx={CX} cy={CY} r={8} />
    </svg>
  )
}
