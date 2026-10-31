import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { findLatestReport, latestReport, reportPaths, timestamp } from "./report-paths"

const at = new Date(2026, 9, 31, 14, 5, 7)

describe("timestamp", () => {
  it("formats local time as YYYY-MM-DD_HHmmss with zero padding", () => {
    expect(timestamp(at)).toBe("2026-10-31_140507")
  })
})

describe("reportPaths", () => {
  it("names csv and html after the scenario and a shared timestamp under sim/reports", () => {
    expect(reportPaths("bypass-loop", at)).toEqual({
      csv: join("sim", "reports", "bypass-loop-2026-10-31_140507.csv"),
      html: join("sim", "reports", "bypass-loop-2026-10-31_140507.html"),
    })
  })
})

describe("latestReport", () => {
  it("picks the newest html across scenarios and ignores other files", () => {
    const files = [
      "startup-cold-2026-10-30_090000.html",
      "bypass-loop-2026-10-31_140507.html",
      "bypass-loop-2026-10-31_140507.csv",
      "report.html",
    ]
    expect(latestReport(files)).toBe("bypass-loop-2026-10-31_140507.html")
  })

  it("returns undefined when there are no timestamped reports", () => {
    expect(latestReport(["report.html", "x.csv"])).toBeUndefined()
  })
})

describe("findLatestReport", () => {
  it("returns the full path of the newest report in a directory", () => {
    const dir = mkdtempSync(join(tmpdir(), "reports-"))
    writeFileSync(join(dir, "a-2026-10-30_090000.html"), "")
    writeFileSync(join(dir, "b-2026-10-31_090000.html"), "")
    expect(findLatestReport(dir)).toBe(join(dir, "b-2026-10-31_090000.html"))
    rmSync(dir, { recursive: true })
  })

  it("returns undefined when the directory does not exist", () => {
    expect(findLatestReport(join(tmpdir(), "no-such-reports-dir"))).toBeUndefined()
  })
})
