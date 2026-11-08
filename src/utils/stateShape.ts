/** Pure shape check of a plant state against a template; shared by the headless runner and the UI presets. */

// Where `value` differs in shape from `template`: missing or extra keys, or a different type.
// Own keys only (ES2020 lib has no Object.hasOwn); `in` would also match inherited names
const has = (o: Record<string, unknown>, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k)

export function shapeErrors(template: unknown, value: unknown, path = "state"): string[] {
  const kind = (v: unknown) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v)
  if (kind(template) !== kind(value)) return [`${path}: expected ${kind(template)}, got ${kind(value)}`]
  if (kind(template) !== "object") return []
  const want = template as Record<string, unknown>
  const got = value as Record<string, unknown>
  const missing = Object.keys(want).filter((k) => !has(got, k)).map((k) => `${path}.${k}: missing`)
  const extra = Object.keys(got).filter((k) => !has(want, k)).map((k) => `${path}.${k}: unexpected`)
  const nested = Object.keys(want)
    .filter((k) => has(got, k))
    .flatMap((k) => shapeErrors(want[k], got[k], `${path}.${k}`))
  return [...missing, ...extra, ...nested]
}
