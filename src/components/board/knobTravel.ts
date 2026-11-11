/** Knob travel maths of the centre-zero knob (-1 to 1 over a sweep of +-135 degrees, dragged horizontally). */

export const SWEEP_END = 135

export const roundTravel = (value: number): number => Math.round(value * 100) / 100
export const clampTravel = (value: number): number => Math.max(-1, Math.min(1, roundTravel(value)))

// Pixels of horizontal drag for a full sweep from one end to the other (-1 to 1)
export const DRAG_FULL_SWEEP_PX = 120

// A pump knob needs four times the drag for the same change, so small adjustments are easy
export const PUMP_DRAG_FULL_SWEEP_PX = DRAG_FULL_SWEEP_PX * 4

// Knob travel from a drag: the value at pointer-down plus the horizontal pointer travel since (right raises, left
// lowers; vertical travel does not count), clamped to the ends
export function knobValueFromDrag(startValue: number, dx: number, fullSweepPx: number = DRAG_FULL_SWEEP_PX): number {
  return clampTravel(startValue + (dx * 2) / fullSweepPx)
}
