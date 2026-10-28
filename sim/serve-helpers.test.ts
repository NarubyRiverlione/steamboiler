import { Buffer } from "node:buffer"
import { NetworkInterfaceInfo } from "node:os"
import { describe, expect, test } from "vitest"
import { isReportPath, lanUrls, respond } from "./serve-helpers"

const read = (contents: string) => () => Promise.resolve(Buffer.from(contents))
const missing = () => Promise.reject(new Error("ENOENT"))

describe("isReportPath", () => {
  test("accepts the root and the report name only", () => {
    expect(isReportPath("/")).toBe(true)
    expect(isReportPath("/report.html")).toBe(true)
    expect(isReportPath("/../etc/passwd")).toBe(false)
    expect(isReportPath(undefined)).toBe(false)
  })
})

describe("respond", () => {
  test("serves the report uncached", async () => {
    const res = await respond("/", "report.html", read("<html>"))
    expect(res.status).toBe(200)
    expect(res.headers["Cache-Control"]).toBe("no-store")
    expect(res.body.toString()).toBe("<html>")
  })

  test("404s other paths without touching the file", async () => {
    const res = await respond("/other", "report.html", missing)
    expect(res).toMatchObject({ status: 404, body: "Not found" })
  })

  test("explains a missing report", async () => {
    const res = await respond("/", "report.html", missing)
    expect(res.status).toBe(404)
    expect(res.body).toContain("run `pnpm sim` first")
  })
})

describe("lanUrls", () => {
  const nic = (address: string, family: "IPv4" | "IPv6", internal: boolean) =>
    ({ address, family, internal }) as NetworkInterfaceInfo

  test("lists external IPv4 addresses only", () => {
    const urls = lanUrls(
      {
        lo: [nic("127.0.0.1", "IPv4", true)],
        eth0: [nic("192.168.1.101", "IPv4", false), nic("fe80::1", "IPv6", false)],
        tun0: undefined,
      },
      4174,
    )
    expect(urls).toEqual(["http://192.168.1.101:4174/"])
  })
})
