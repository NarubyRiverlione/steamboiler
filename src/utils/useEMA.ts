/**
 * Readout smoothing: an exponential moving average with a time constant in wall seconds.
 * One step per change of value, with alpha derived from the wall time since the previous step,
 * so the lag does not depend on the playback speed or the render cadence (#122).
 * No timer: a smoothed readout holds still while the value is constant (paused sim, hidden tab).
 */
import { useState } from "react"

// A gap longer than this many time constants counts as this many, so the first change after a pause snaps cleanly
const MaxGapInTau = 5

export function smoothingAlpha(dtSeconds: number, tauSeconds: number): number {
  return 1 - Math.exp(-dtSeconds / tauSeconds)
}

function useEMA(value: number, tauSeconds: number, now: () => number = () => performance.now()): number {
  const [state, setState] = useState(() => ({ ema: value, value, at: now() }))

  // One EMA step per change of value, derived during render (no effect, no extra render pass)
  if (state.value !== value) {
    const at: number = now()
    const dt: number = Math.min(Math.max((at - state.at) / 1000, 0), MaxGapInTau * tauSeconds)
    const alpha: number = smoothingAlpha(dt, tauSeconds)
    setState({ ema: alpha * value + (1 - alpha) * state.ema, value, at })
  }

  return state.ema
}

export default useEMA
