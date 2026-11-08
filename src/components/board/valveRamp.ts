/** Travel of a valve knob: a UX constant (not a plant parameter, #41) that paces the dispatched position toward the commanded one. */

// Real seconds for a full 0 to 100 % travel, the same at every playback speed
export const FULL_TRAVEL_SECONDS = 5
export const RAMP_TICK_MS = 50
export const RAMP_STEP: number = RAMP_TICK_MS / 1000 / FULL_TRAVEL_SECONDS // fraction per tick
export const RAMP_EPSILON = 1e-6

// A dispatch that leaves the position where it was (refused by the reducer) is retried this many ticks, then dropped
export const MAX_STALLED_TICKS = 3

// The change to dispatch this tick: toward the target, at most one ramp step
export function rampStep(actual: number, target: number, maxStep: number = RAMP_STEP): number {
  const delta: number = target - actual
  return Math.max(-maxStep, Math.min(maxStep, delta))
}
