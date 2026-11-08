/**
 * Rotary knob, adapted from the full-board mockup (knob). Two modes:
 * - absolute: the pointer shows a level from min to max, display only (valve knobs, #41);
 * - centre-zero: a latching rate knob (the gas knob, #15). The position is a command from -1 to 1, centre holds, and it
 *   turns with mouse drag, scroll wheel and arrow keys. Its shape differs from the absolute one: a bold detent at 12
 *   o'clock that lights at zero rate, a bipolar arc, ticks denser towards the ends, LOWER/HOLD/RAISE labels and its own
 *   cap tint.
 */

import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react"
import { clampTravel, knobValueFromDrag, SWEEP_END } from "./knobTravel"
import "./board.css"

type AbsoluteKnobProps = {
  readonly mode?: "absolute"
  readonly label: string
  readonly value: number
  readonly min: number
  readonly max: number
  readonly ends: readonly [string, string]
  readonly note?: string
  readonly size?: number
}

type CentreZeroKnobProps = {
  readonly mode: "centre-zero"
  readonly label: string
  readonly value: number // -1 to 1, 0 holds
  readonly deadZone: number // share of the travel either side of the centre that counts as zero rate
  readonly onChange: (value: number) => void
  readonly size?: number
}

type KnobProps = AbsoluteKnobProps | CentreZeroKnobProps

const CX = 85
const CY = 85
const SWEEP_START = -135
const TICK_COUNT = 10
const GRIP_COUNT = 24

function polar(radius: number, deg: number): [number, number] {
  const rad: number = ((deg - 90) * Math.PI) / 180
  return [CX + radius * Math.cos(rad), CY + radius * Math.sin(rad)]
}

const RATE_STEP = 0.1 // knob travel per arrow key press or wheel notch
const RATE_TICKS_PER_SIDE = 4

// Tick positions on one side: equal steps of rate, so denser towards the end where the quadratic taper is steepest
function rateTicks(deadZone: number): number[] {
  return Array.from(
    { length: RATE_TICKS_PER_SIDE },
    (_: unknown, i: number) => deadZone + (1 - deadZone) * Math.sqrt((i + 1) / RATE_TICKS_PER_SIDE),
  )
}

function arcPath(radius: number, deg: number): string {
  const [x0, y0]: [number, number] = polar(radius, 0)
  const [x1, y1]: [number, number] = polar(radius, deg)
  return `M ${String(x0)} ${String(y0)} A ${String(radius)} ${String(radius)} 0 0 ${deg > 0 ? "1" : "0"} ${String(x1)} ${String(y1)}`
}

function CentreZeroKnob({ label, value, deadZone, onChange, size = 150 }: Omit<CentreZeroKnobProps, "mode">) {
  const ref = useRef<SVGSVGElement>(null)
  const drag = useRef<{ startX: number; startValue: number } | null>(null)

  // The wheel listener is not passive, so the page does not scroll while the knob turns
  useEffect(() => {
    const node: SVGSVGElement | null = ref.current
    if (node === null) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      onChange(clampTravel(value + (e.deltaY < 0 ? RATE_STEP : -RATE_STEP)))
    }
    node.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      node.removeEventListener("wheel", onWheel)
    }
  }, [value, onChange])

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    const steps: Record<string, number | undefined> = {
      ArrowRight: value + RATE_STEP,
      ArrowUp: value + RATE_STEP,
      ArrowLeft: value - RATE_STEP,
      ArrowDown: value - RATE_STEP,
      Home: 0,
    }
    const next: number | undefined = steps[e.key]
    if (next === undefined) return
    e.preventDefault()
    onChange(clampTravel(next))
  }

  const zero: boolean = Math.abs(value) <= deadZone
  const angle: number = value * SWEEP_END
  const grips: number[] = Array.from({ length: GRIP_COUNT }, (_: unknown, i: number) => i)
  const sides: number[] = [1, -1]
  return (
    <svg
      ref={ref}
      className="board-knob board-knob-rate"
      viewBox="0 0 170 170"
      width={size}
      height={size}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={-1}
      aria-valuemax={1}
      aria-valuenow={value}
      aria-valuetext={zero ? "Holding" : value > 0 ? "Raising" : "Lowering"}
      onKeyDown={onKeyDown}
      onPointerDown={(e: PointerEvent<SVGSVGElement>) => {
        drag.current = { startX: e.clientX, startValue: value }
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e: PointerEvent<SVGSVGElement>) => {
        if (drag.current === null) return
        onChange(knobValueFromDrag(drag.current.startValue, e.clientX - drag.current.startX))
      }}
      onPointerUp={() => {
        drag.current = null
      }}
    >
      {sides.flatMap((side: number) =>
        rateTicks(deadZone).map((travel: number, i: number) => {
          const deg: number = side * travel * SWEEP_END
          const [x1, y1]: [number, number] = polar(70, deg)
          const [x2, y2]: [number, number] = polar(78, deg)
          const end: boolean = i === RATE_TICKS_PER_SIDE - 1
          return (
            <line
              key={`${String(side)}-${String(i)}`}
              className={end ? "board-tick board-tick-major" : "board-tick"}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
            />
          )
        }),
      )}
      <line
        className={zero ? "board-detent board-detent-lit" : "board-detent"}
        x1={CX}
        y1={CY - 86}
        x2={CX}
        y2={CY - 64}
      />
      {!zero && <path className="board-knob-arc" d={arcPath(62, angle)} />}
      <text className="board-knob-end" x={34} y={158} textAnchor="middle">
        LOWER ▼
      </text>
      <text className="board-knob-end" x={136} y={158} textAnchor="middle">
        ▲ RAISE
      </text>
      <text className="board-knob-note board-knob-hold" x={CX} y={158} textAnchor="middle">
        HOLD
      </text>
      <circle className="board-knob-bezel" cx={CX} cy={CY} r={54} />
      <circle className="board-knob-well" cx={CX} cy={CY} r={46} />
      <g transform={`rotate(${angle.toFixed(2)} ${String(CX)} ${String(CY)})`}>
        <circle className="board-knob-cap board-knob-cap-rate" cx={CX} cy={CY} r={44} />
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

export function Knob(props: KnobProps) {
  if (props.mode === "centre-zero") return <CentreZeroKnob {...props} />
  return <AbsoluteKnob {...props} />
}

function AbsoluteKnob({ label, value, min, max, ends, note, size = 150 }: AbsoluteKnobProps) {
  const clamped: number = Math.min(max, Math.max(min, value))
  const angle: number = SWEEP_START + ((SWEEP_END - SWEEP_START) * (clamped - min)) / (max - min)
  const ticks: number[] = Array.from({ length: TICK_COUNT + 1 }, (_: unknown, i: number) => i)
  const grips: number[] = Array.from({ length: GRIP_COUNT }, (_: unknown, i: number) => i)
  return (
    <svg
      className="board-knob"
      viewBox="0 0 170 170"
      width={size}
      height={size}
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
