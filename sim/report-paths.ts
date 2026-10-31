import { readdirSync } from "node:fs"
import { join } from "node:path"

export const REPORTS_DIR = join("sim", "reports")

// Local time as YYYY-MM-DD_HHmmss: filename-safe and sorts chronologically.
export function timestamp(now: Date): string {
  const p = (n: number) => String(n).padStart(2, "0")
  const date = `${String(now.getFullYear())}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
  return `${date}_${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`
}

// Both outputs of one run share a base name: <scenario>-<timestamp>.
export function reportPaths(scenario: string, now: Date): { csv: string; html: string } {
  const base = join(REPORTS_DIR, `${scenario}-${timestamp(now)}`)
  return { csv: `${base}.csv`, html: `${base}.html` }
}

// Newest report by name; the timestamp suffix makes name order per scenario chronological,
// so compare on the suffix to get the newest across scenarios.
export function latestReport(files: string[]): string | undefined {
  const stamp = (f: string) => /(\d{4}-\d{2}-\d{2}_\d{6})\.html$/.exec(f)?.[1]
  return files
    .filter((f) => stamp(f) !== undefined)
    .sort((a, b) => (stamp(a) ?? "").localeCompare(stamp(b) ?? ""))
    .at(-1)
}

export function findLatestReport(dir: string = REPORTS_DIR): string | undefined {
  try {
    const newest = latestReport(readdirSync(dir))
    return newest === undefined ? undefined : join(dir, newest)
  } catch {
    return undefined
  }
}
