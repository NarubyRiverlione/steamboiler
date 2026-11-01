/**
 * The dead band shared by the scenario operators' holds: outside the band always correct, inside it only lean
 * against the trend so the value settles.
 */

// +1 when the actuator should go up (the value is low), -1 when down, 0 to hold
export function bandDirection(error: number, band: number, trend: number): -1 | 0 | 1 {
  const correcting = Math.abs(error) > band || Math.sign(trend) === Math.sign(error)
  if (error === 0 || !correcting) return 0
  return error < 0 ? 1 : -1
}
