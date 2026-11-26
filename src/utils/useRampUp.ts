/**
 * Readout ramp: a rising value is shown climbing at a fixed rate per wall second, a falling one at once.
 * UX only, the model is not touched: the turning gear holds the rotor at gear speed in one tick, and the
 * operator should see it climb. A timer runs only while the shown value is still climbing.
 */
import { useEffect, useState } from "react"

// Wall milliseconds between two steps of a climb
const StepMs = 100

const wallNow = (): number => performance.now()

function useRampUp(value: number, ratePerSecond: number, now: () => number = wallNow): number {
  const [shown, setShown] = useState<number>(value)

  // A fall is shown at once, derived during render (no effect, no extra render pass)
  if (value < shown) setShown(value)

  const climbing: boolean = shown < value
  useEffect(() => {
    if (!climbing) return undefined
    let last: number = now()
    const id: ReturnType<typeof setInterval> = setInterval(() => {
      const at: number = now()
      const step: number = (ratePerSecond * (at - last)) / 1000
      last = at
      setShown((s: number) => Math.min(value, s + step))
    }, StepMs)
    return () => {
      clearInterval(id)
    }
  }, [climbing, value, ratePerSecond, now])

  return Math.min(shown, value)
}

export default useRampUp
