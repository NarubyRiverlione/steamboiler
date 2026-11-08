/** Knob travel maths of the centre-zero knob (-1 to 1 over a sweep of +-135 degrees). */

export const SWEEP_END = 135

export const roundTravel = (value: number): number => Math.round(value * 100) / 100
export const clampTravel = (value: number): number => Math.max(-1, Math.min(1, roundTravel(value)))

// Knob travel (-1 to 1) from a pointer offset to the knob centre: 0 straight up, clamped to the sweep (the dead sector
// below the knob goes to the nearer end)
export function knobValueFromPointer(dx: number, dy: number): number {
  const degrees: number = (Math.atan2(dx, -dy) * 180) / Math.PI
  const clamped: number = Math.max(-SWEEP_END, Math.min(SWEEP_END, degrees))
  return roundTravel(clamped / SWEEP_END)
}
