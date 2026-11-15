/** Fine-tune button maths: snap a command to the knob's step grid, then move it by one step (percent, 0 to 100). */

export const MIN_PERCENT = 0
export const MAX_PERCENT = 100

// Nearest step on the grid, clamped; an exact .5 tie rounds up
export const snapToStep = (percent: number, step: number): number =>
  Math.max(MIN_PERCENT, Math.min(MAX_PERCENT, Math.round(percent / step) * step))

// The command after one click: snapped first, then one step up (+1) or down (-1), clamped
export function fineStep(percent: number, step: number, direction: 1 | -1): number {
  const snapped: number = snapToStep(percent, step)
  return Math.max(MIN_PERCENT, Math.min(MAX_PERCENT, snapped + direction * step))
}
