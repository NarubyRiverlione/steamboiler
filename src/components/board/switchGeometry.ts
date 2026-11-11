/** Geometry of the turn switch plate (#124): a tick drawn from radius r1 to r2 at an angle from vertical. */

export type Tick = { readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number }

export function tickAt(deg: number, r1: number, r2: number): Tick {
  const rad: number = (deg * Math.PI) / 180
  return { x1: Math.sin(rad) * r1, y1: -Math.cos(rad) * r1, x2: Math.sin(rad) * r2, y2: -Math.cos(rad) * r2 }
}
