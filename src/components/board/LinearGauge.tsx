/** Linear gauge on any min-max scale. Vertical: a vessel level (glass, water fill, zone strip, ticks, pointer). Horizontal: a straight-scale meter (dial face, a framed zone band as tall as the major ticks, major and minor ticks, a needle). Adapted from MC-v2 / the full-board mockup (level). */

import "./board.css"
import type { GaugeZone } from "./RoundGauge"

export type GaugeBand = { readonly from: number; readonly to: number } // a marked band on the scale, in scale units

type LinearGaugeProps = {
  readonly label: string
  readonly value: number
  readonly orientation?: "vertical" | "horizontal"
  readonly min?: number
  readonly max?: number
  readonly unit?: string // printed on the face of a horizontal meter
  readonly zones?: readonly GaugeZone[] // scale units
  readonly ticks?: readonly number[] // scale units, each labelled; ignored when major and minor are given
  readonly major?: number // labelled tick every `major` from min
  readonly minor?: number // unlabelled tick every `minor` from min
  readonly bands?: readonly GaugeBand[]
  readonly target?: number // scale units, a line across the scale at the level the vessel should hold
}

type Tick = { readonly at: number; readonly major: boolean }
type Span = { readonly from: number; readonly size: number }

type Scale = {
  readonly pos: (v: number) => number // axis position of a scale value, clamped to the scale
  readonly start: number
  readonly end: number
  readonly ticks: readonly Tick[]
  readonly band: (b: GaugeBand) => Span
  readonly zone: (z: GaugeZone) => Span
}

const VERTICAL = { viewBox: "0 0 96 190", width: 96, height: 190, start: 176, end: 14 } as const
const HORIZONTAL = { viewBox: "0 0 320 96", width: 320, height: 96, start: 22, end: 298 } as const
const MIN_BAND_PX = 3

function scaleTicks(
  min: number,
  max: number,
  ticks: readonly number[],
  major?: number,
  minor?: number,
): Tick[] {
  if (major === undefined || minor === undefined) return ticks.map((t: number) => ({ at: t, major: true }))
  const out: Tick[] = []
  for (let v: number = min; v <= max + 1e-9; v += minor) {
    out.push({ at: v, major: Math.abs((v - min) / major - Math.round((v - min) / major)) < 1e-6 })
  }
  return out
}

function makeScale(min: number, max: number, start: number, end: number, ticks: readonly Tick[]): Scale {
  const pos = (v: number): number =>
    start + ((end - start) * (Math.min(max, Math.max(min, v)) - min)) / (max - min)
  const span = (from: number, to: number): Span => ({
    from: Math.min(pos(from), pos(to)),
    size: Math.abs(pos(to) - pos(from)),
  })
  const band = (b: GaugeBand): Span => {
    const s: Span = span(b.from, b.to)
    const size: number = Math.max(MIN_BAND_PX, s.size)
    return { from: s.from + s.size / 2 - size / 2, size }
  }
  return { pos, start, end, ticks, band, zone: (z: GaugeZone) => span(z.from, z.to) }
}

const zoneKey = (z: { readonly from: number; readonly to: number }): string =>
  `${String(z.from)}-${String(z.to)}`

export function LinearGauge({
  label,
  value,
  orientation = "vertical",
  min = 0,
  max = 100,
  unit,
  zones = [],
  ticks = [min, (min + max) / 2, max],
  major,
  minor,
  bands = [],
  target,
}: LinearGaugeProps) {
  const horizontal: boolean = orientation === "horizontal"
  const layout: typeof VERTICAL | typeof HORIZONTAL = horizontal ? HORIZONTAL : VERTICAL
  const scale: Scale = makeScale(
    min,
    max,
    layout.start,
    layout.end,
    scaleTicks(min, max, ticks, major, minor),
  )
  const parts: GaugeParts = { scale, value, zones, bands, target }

  return (
    <svg
      className={horizontal ? "board-level board-level-horizontal" : "board-level"}
      viewBox={layout.viewBox}
      width={layout.width}
      height={layout.height}
      role="meter"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      {horizontal ? <HorizontalMeter {...parts} unit={unit} /> : <VerticalLevel {...parts} />}
    </svg>
  )
}

type GaugeParts = {
  readonly scale: Scale
  readonly value: number
  readonly zones: readonly GaugeZone[]
  readonly bands: readonly GaugeBand[]
  readonly target?: number
}

// horizontal: a straight-scale meter, read by the needle; zones, ticks and bands share one scale
function HorizontalMeter({
  scale,
  value,
  zones,
  bands,
  target,
  unit,
}: GaugeParts & { readonly unit?: string }) {
  const { pos, start, end } = scale
  const at: number = pos(value)
  return (
    <>
      <rect className="board-gauge-bezel" x={2} y={2} width={316} height={92} rx={8} />
      <rect className="board-gauge-face" x={8} y={8} width={304} height={80} rx={4} />
      {zones.map((z: GaugeZone) => {
        const r: Span = scale.zone(z)
        return (
          <rect
            key={zoneKey(z)}
            className={`board-zone-bar board-zone-${z.tone}`}
            data-tone={z.tone}
            x={r.from}
            y={36}
            width={r.size}
            height={20}
          />
        )
      })}
      <rect className="board-meter-frame" x={start} y={36} width={end - start} height={20} />
      {scale.ticks.map((t: Tick) => (
        <g key={t.at}>
          <line
            className={t.major ? "board-tick board-tick-major" : "board-tick"}
            x1={pos(t.at)}
            y1={t.major ? 36 : 44}
            x2={pos(t.at)}
            y2={56}
          />
          {t.major && (
            <text className="board-gauge-text" x={pos(t.at)} y={72}>
              {t.at}
            </text>
          )}
        </g>
      ))}
      {bands.map((b: GaugeBand) => {
        const r: Span = scale.band(b)
        return (
          <rect key={zoneKey(b)} className="board-level-band" x={r.from} y={30} width={r.size} height={26} />
        )
      })}
      {target !== undefined && (
        <line
          className="board-level-target"
          data-testid="level-target"
          x1={pos(target)}
          y1={30}
          x2={pos(target)}
          y2={56}
        />
      )}
      {unit !== undefined && (
        <text className="board-gauge-text board-gauge-unit" x={(start + end) / 2} y={84}>
          {unit}
        </text>
      )}
      <path
        className="board-pointer board-needle-bar"
        d={`M${String(at - 1.5)} 62 L${String(at - 1.5)} 20 L${String(at)} 14 L${String(at + 1.5)} 20 L${String(at + 1.5)} 62 Z`}
      />
    </>
  )
}

// vertical: a vessel level, read by the water in the glass
function VerticalLevel({ scale, value, zones, bands, target }: GaugeParts) {
  const { pos, start, end } = scale
  const at: number = pos(value)
  const span: number = Math.abs(end - start)
  return (
    <>
      <rect className="board-level-housing" x={8} y={end - 8} width={52} height={span + 16} rx={6} />
      <rect className="board-level-glass" x={18} y={end} width={32} height={span} />
      <rect className="board-level-fill" x={19} y={at} width={30} height={Math.max(0, start - at)} />
      {target !== undefined && (
        <line
          className="board-level-target"
          data-testid="level-target"
          x1={14}
          y1={pos(target)}
          x2={54}
          y2={pos(target)}
        />
      )}
      {bands.map((b: GaugeBand) => {
        const r: Span = scale.band(b)
        return (
          <rect key={zoneKey(b)} className="board-level-band" x={18} y={r.from} width={32} height={r.size} />
        )
      })}
      {zones.map((z: GaugeZone) => {
        const r: Span = scale.zone(z)
        return (
          <rect
            key={zoneKey(z)}
            className={`board-zone-bar board-zone-${z.tone}`}
            data-tone={z.tone}
            x={64}
            y={r.from}
            width={8}
            height={r.size}
          />
        )
      })}
      {scale.ticks.map((t: Tick) => (
        <g key={t.at}>
          <line className="board-tick" x1={60} y1={pos(t.at)} x2={t.major ? 76 : 70} y2={pos(t.at)} />
          {t.major && (
            <text className="board-gauge-text board-level-tick" x={78} y={pos(t.at) + 4}>
              {t.at}
            </text>
          )}
        </g>
      ))}
      <path className="board-pointer" d={`M62 ${String(at)} l-8 -5 v10 Z`} />
    </>
  )
}
