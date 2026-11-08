/**
 * Playback speed: ticks per wall-clock second, never a change of DeltaTime (ADR 0034).
 * 1x is 1/DeltaTime ticks per second, the rate of the original loop.
 */
import { CstSimulation } from "./const"

export const PlaybackSpeeds = [0, 1, 10, 60] as const
export type PlaybackSpeed = (typeof PlaybackSpeeds)[number]

const { DeltaTime, MaxTicksPerUpdate } = CstSimulation

export type WallClock = {
  lastMs: number // wall time of the previous update
  carry: number // fraction of a tick not yet run
}

export const startWallClock = (nowMs: number): WallClock => ({ lastMs: nowMs, carry: 0 })

// Ticks due since the last update. A hidden tab or a pause consumes the wall time without ticking, so nothing is
// caught up later. At the cap the plant runs slower than requested; the remainder is dropped, no tick is skipped.
export function ticksDue(
  clock: WallClock,
  nowMs: number,
  speed: PlaybackSpeed,
  hidden: boolean,
): { ticks: number; clock: WallClock } {
  if (hidden || speed === 0) return { ticks: 0, clock: startWallClock(nowMs) }
  const elapsedSeconds: number = Math.max(0, nowMs - clock.lastMs) / 1000
  const due: number = clock.carry + (elapsedSeconds * speed) / DeltaTime
  const whole: number = Math.floor(due)
  if (whole >= MaxTicksPerUpdate) return { ticks: MaxTicksPerUpdate, clock: startWallClock(nowMs) }
  return { ticks: whole, clock: { lastMs: nowMs, carry: due - whole } }
}

export const simulatedSeconds = (ticks: number): number => ticks * DeltaTime

// h:mm:ss
export function formatClock(seconds: number): string {
  const total: number = Math.floor(seconds)
  const pad = (n: number): string => String(n).padStart(2, "0")
  return `${String(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`
}
