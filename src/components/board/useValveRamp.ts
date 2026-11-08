/**
 * Paces a valve knob (#41). A turn of the knob sets a commanded position; this hook dispatches the difference at a fixed
 * real-time rate (valveRamp.ts) until the actual position arrives. The ramp follows the actual position: when something
 * else moves the valve (the turbine governor) or the reducer refuses the move, the command is dropped and the knob shows
 * the actual position again, so an old ramp never fights the new position.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { MAX_STALLED_TICKS, RAMP_EPSILON, RAMP_TICK_MS, rampStep } from "./valveRamp"

type Dispatched = { readonly from: number; readonly expected: number }

type ValveRamp = {
  readonly commanded: number | null // 0..1 while a ramp runs, otherwise null
  readonly command: (target: number) => void
}

export function useValveRamp(actual: number, cbAdjust: (delta: number) => void): ValveRamp {
  const [commanded, setCommanded] = useState<number | null>(null)
  const actualRef = useRef<number>(actual)
  const cbRef = useRef<(delta: number) => void>(cbAdjust)
  const targetRef = useRef<number | null>(null)
  const lastRef = useRef<Dispatched | null>(null)
  const stalledRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Layout effect: the ref is current before the next tick, which can run right after a render
  useLayoutEffect(() => {
    actualRef.current = actual
    cbRef.current = cbAdjust
  })

  const stop = useCallback((): void => {
    if (timerRef.current !== null) clearInterval(timerRef.current)
    timerRef.current = null
    targetRef.current = null
    lastRef.current = null
    stalledRef.current = 0
    setCommanded(null)
  }, [])

  const tick = useCallback((): void => {
    const target: number | null = targetRef.current
    if (target === null) { stop(); return; }
    const current: number = actualRef.current
    const last: Dispatched | null = lastRef.current
    if (last !== null) {
      if (Math.abs(current - last.expected) <= RAMP_EPSILON) {
        stalledRef.current = 0
      } else if (Math.abs(current - last.from) > RAMP_EPSILON) {
        stop(); return; // moved by something else
      } else if (++stalledRef.current >= MAX_STALLED_TICKS) {
        stop(); return; // refused
      }
    }
    const delta: number = rampStep(current, target)
    if (Math.abs(delta) <= RAMP_EPSILON) { stop(); return; }
    lastRef.current = { from: current, expected: current + delta }
    cbRef.current(delta)
  }, [stop])

  const command = useCallback(
    (target: number): void => {
      targetRef.current = Math.max(0, Math.min(1, target))
      stalledRef.current = 0
      setCommanded(targetRef.current)
      timerRef.current ??= setInterval(tick, RAMP_TICK_MS)
    },
    [tick],
  )

  useEffect(() => stop, [stop])

  return { commanded, command }
}
