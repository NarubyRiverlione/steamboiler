/**
 * Paces the valve knobs (#41, #127). A turn of a knob sets a commanded position; this provider dispatches the difference
 * at a fixed real-time rate (valveRamp.ts) until the actual position arrives. It lives above the pages, so a ramp goes on
 * while another page is shown. Each ramp follows its valve's actual position: when something else moves the valve (the
 * turbine governor) or the reducer refuses the move, the command is dropped and the knob shows the actual position again.
 * UI state only: the plant never learns the setpoint (ADR 0042).
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { MAX_STALLED_TICKS, RAMP_EPSILON, RAMP_TICK_MS, rampStep } from "./valveRamp"
import { ValveRampContext, type ValveId, type ValveRampValue } from "./valveRampContext"

export type ValveHandle = {
  readonly actual: number // 0..1, how much the valve is actually open
  readonly adjust: (delta: number) => void // change of position as a fraction
}

type Ramp = {
  target: number
  last: { readonly from: number; readonly expected: number } | null // the last dispatch, to see who moved the valve
  stalled: number
}

type ValveRampProviderProps = {
  readonly valves: Readonly<Partial<Record<ValveId, ValveHandle>>>
  readonly children: ReactNode
}

export function ValveRampProvider({ valves, children }: ValveRampProviderProps) {
  const [commanded, setCommanded] = useState<Readonly<Record<ValveId, number>>>({})
  const valvesRef = useRef<Readonly<Partial<Record<ValveId, ValveHandle>>>>(valves)
  const rampsRef = useRef<Map<ValveId, Ramp>>(new Map())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Layout effect: the ref is current before the next tick, which can run right after a render
  useLayoutEffect(() => {
    valvesRef.current = valves
  })

  const tick = useCallback((): void => {
    const dropped: ValveId[] = []
    for (const [id, ramp] of rampsRef.current) {
      const valve: ValveHandle | undefined = valvesRef.current[id]
      if (valve === undefined) {
        dropped.push(id)
        continue
      }
      const current: number = valve.actual
      if (ramp.last !== null) {
        if (Math.abs(current - ramp.last.expected) <= RAMP_EPSILON) {
          ramp.stalled = 0
        } else if (Math.abs(current - ramp.last.from) > RAMP_EPSILON) {
          dropped.push(id)
          continue // moved by something else
        } else if (++ramp.stalled >= MAX_STALLED_TICKS) {
          dropped.push(id)
          continue // refused
        }
      }
      const delta: number = rampStep(current, ramp.target)
      if (Math.abs(delta) <= RAMP_EPSILON) {
        dropped.push(id)
        continue
      }
      ramp.last = { from: current, expected: current + delta }
      valve.adjust(delta)
    }
    if (dropped.length === 0) return
    for (const id of dropped) rampsRef.current.delete(id)
    if (rampsRef.current.size === 0 && timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setCommanded((prev: Readonly<Record<ValveId, number>>) =>
      Object.fromEntries(Object.entries(prev).filter(([id]) => !dropped.includes(id))),
    )
  }, [])

  const command = useCallback(
    (id: ValveId, target: number): void => {
      const clamped: number = Math.max(0, Math.min(1, target))
      const ramp: Ramp | undefined = rampsRef.current.get(id)
      if (ramp === undefined) rampsRef.current.set(id, { target: clamped, last: null, stalled: 0 })
      else {
        ramp.target = clamped
        ramp.stalled = 0
      }
      setCommanded((prev: Readonly<Record<ValveId, number>>) => ({ ...prev, [id]: clamped }))
      timerRef.current ??= setInterval(tick, RAMP_TICK_MS)
    },
    [tick],
  )

  // The ramps end with the provider, not with a page
  useEffect(
    () => () => {
      if (timerRef.current !== null) clearInterval(timerRef.current)
      timerRef.current = null
      rampsRef.current.clear()
    },
    [],
  )

  const value: ValveRampValue = useMemo(() => ({ commanded, command }), [commanded, command])
  return <ValveRampContext.Provider value={value}>{children}</ValveRampContext.Provider>
}
