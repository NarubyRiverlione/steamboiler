import { Buffer } from "node:buffer"
import { NetworkInterfaceInfo } from "node:os"

export type Response = { status: number; headers: Record<string, string>; body: string | Buffer }

// Only the report itself is served; everything else is a 404.
export const isReportPath = (url: string | undefined) => url === "/" || url === "/report.html"

// Reads the report per request so a re-run of `pnpm sim` shows up on refresh.
export async function respond(
  url: string | undefined,
  file: string,
  read: (path: string) => Promise<Buffer>,
): Promise<Response> {
  if (!isReportPath(url)) return { status: 404, headers: { "Content-Type": "text/plain" }, body: "Not found" }
  try {
    const html = await read(file)
    return {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
      body: html,
    }
  } catch {
    return {
      status: 404,
      headers: { "Content-Type": "text/plain" },
      body: `${file} not found — run \`pnpm sim\` first.`,
    }
  }
}

// External IPv4 addresses as browsable URLs, for reaching a headless box from another machine.
export function lanUrls(
  interfaces: Record<string, NetworkInterfaceInfo[] | undefined>,
  port: number,
): string[] {
  return Object.values(interfaces)
    .flatMap((addresses) => addresses ?? [])
    .filter((a) => a.family === "IPv4" && !a.internal)
    .map((a) => `http://${a.address}:${String(port)}/`)
}
