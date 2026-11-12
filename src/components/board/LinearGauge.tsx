/** Linear gauge, vertical or horizontal, on any min-max scale, with a coloured zone strip, marked bands, ticks and a pointer. Adapted from MC-v2 / the full-board mockup (level). */

import "./board.css"
import type { GaugeZone } from "./RoundGauge"

export type GaugeBand = { readonly from: number; readonly to: number } // a marked band on the glass, in scale units

type LinearGaugeProps = {
  readonly label: string
  readonly value: number
  readonly orientation?: "vertical" | "horizontal"
  readonly min?: number
  readonly max?: number
  readonly zones?: readonly GaugeZone[] // scale units
  readonly ticks?: readonly number[] // scale units
  readonly bands?: readonly GaugeBand[]
  readonly target?: number // scale units, a line across the glass at the level the vessel should hold
}

type Layout = {
  readonly viewBox: string
  readonly width: number
  readonly height: number
  readonly start: number // axis position of min
  readonly end: number // axis position of max
}

const VERTICAL: Layout = { viewBox: "0 0 96 190", width: 96, height: 190, start: 176, end: 14 }
const HORIZONTAL: Layout = { viewBox: "0 0 300 100", width: 300, height: 100, start: 14, end: 286 }
const MIN_BAND_PX = 3

export function LinearGauge({
  label,
  value,
  orientation = "vertical",
  min = 0,
  max = 100,
  zones = [],
  ticks = [min, (min + max) / 2, max],
  bands = [],
  target,
}: LinearGaugeProps) {
  const horizontal: boolean = orientation === "horizontal"
  const { viewBox, width, height, start, end }: Layout = horizontal ? HORIZONTAL : VERTICAL
  // position of a scale value along the axis (y for vertical, x for horizontal)
  const pos = (v: number): number => start + ((end - start) * (Math.min(max, Math.max(min, v)) - min)) / (max - min)
  const at: number = pos(value)
  const span: number = Math.abs(end - start)

  const bandRect = (b: GaugeBand): { from: number; size: number } => {
    const a: number = Math.min(pos(b.from), pos(b.to))
    const size: number = Math.max(MIN_BAND_PX, Math.abs(pos(b.to) - pos(b.from)))
    return { from: a + Math.abs(pos(b.to) - pos(b.from)) / 2 - size / 2, size }
  }
  const zoneRect = (z: GaugeZone): { from: number; size: number } => ({
    from: Math.min(pos(z.from), pos(z.to)),
    size: Math.abs(pos(z.to) - pos(z.from)),
  })

  return (
    <svg
      className={horizontal ? "board-level board-level-horizontal" : "board-level"}
      viewBox={viewBox}
      width={width}
      height={height}
      role="meter"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      {horizontal ? (
        <>
          <rect className="board-level-housing" x={start - 8} y={14} width={span + 16} height={44} rx={6} />
          <rect className="board-level-glass" x={start} y={22} width={span} height={28} />
          <rect className="board-level-fill" x={start + 1} y={23} width={Math.max(0, at - start - 1)} height={26} />
          {target !== undefined && (
            <line className="board-level-target" data-testid="level-target" x1={pos(target)} y1={18} x2={pos(target)} y2={54} />
          )}
          {bands.map((b: GaugeBand) => {
            const r: { from: number; size: number } = bandRect(b)
            return (
              <rect
                key={`${String(b.from)}-${String(b.to)}`}
                className="board-level-band"
                x={r.from}
                y={22}
                width={r.size}
                height={28}
              />
            )
          })}
          {zones.map((z: GaugeZone) => {
            const r: { from: number; size: number } = zoneRect(z)
            return (
              <rect
                key={`${String(z.from)}-${String(z.to)}`}
                className={`board-zone-bar board-zone-${z.tone}`}
                data-tone={z.tone}
                x={r.from}
                y={62}
                width={r.size}
                height={8}
              />
            )
          })}
          {ticks.map((t: number) => (
            <g key={t}>
              <line className="board-tick" x1={pos(t)} y1={58} x2={pos(t)} y2={74} />
              <text className="board-gauge-text board-level-tick board-level-tick-h" x={pos(t)} y={88}>
                {t}
              </text>
            </g>
          ))}
          <path className="board-pointer" d={`M${String(at)} 14 l-5 -8 h10 Z`} />
        </>
      ) : (
        <>
          <rect className="board-level-housing" x={8} y={end - 8} width={52} height={span + 16} rx={6} />
          <rect className="board-level-glass" x={18} y={end} width={32} height={span} />
          <rect className="board-level-fill" x={19} y={at} width={30} height={Math.max(0, start - at)} />
          {target !== undefined && (
            <line className="board-level-target" data-testid="level-target" x1={14} y1={pos(target)} x2={54} y2={pos(target)} />
          )}
          {bands.map((b: GaugeBand) => {
            const r: { from: number; size: number } = bandRect(b)
            return (
              <rect
                key={`${String(b.from)}-${String(b.to)}`}
                className="board-level-band"
                x={18}
                y={r.from}
                width={32}
                height={r.size}
              />
            )
          })}
          {zones.map((z: GaugeZone) => {
            const r: { from: number; size: number } = zoneRect(z)
            return (
              <rect
                key={`${String(z.from)}-${String(z.to)}`}
                className={`board-zone-bar board-zone-${z.tone}`}
                data-tone={z.tone}
                x={64}
                y={r.from}
                width={8}
                height={r.size}
              />
            )
          })}
          {ticks.map((t: number) => (
            <g key={t}>
              <line className="board-tick" x1={60} y1={pos(t)} x2={76} y2={pos(t)} />
              <text className="board-gauge-text board-level-tick" x={78} y={pos(t) + 4}>
                {t}
              </text>
            </g>
          ))}
          <path className="board-pointer" d={`M62 ${String(at)} l-8 -5 v10 Z`} />
        </>
      )}
    </svg>
  )
}
