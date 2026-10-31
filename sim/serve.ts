import { readFile } from "node:fs/promises"
import { createServer } from "node:http"
import { networkInterfaces } from "node:os"
import process from "node:process"
import { findLatestReport } from "./report-paths"
import { lanUrls, respond } from "./serve-helpers"

// usage: pnpm sim:serve [report.html]   (PORT env, default 4174)
// Serves the report (default: newest in sim/reports) on all interfaces so it can be browsed from another machine.
const args: (string | undefined)[] = process.argv.slice(2)
const file = args[0] ?? findLatestReport() ?? "sim/reports"
const port = Number(process.env.PORT ?? 4174)

const server = createServer((req, res) => {
  void respond(req.url, file, readFile).then(({ status, headers, body }) =>
    res.writeHead(status, headers).end(body),
  )
})

server.listen(port, "0.0.0.0", () => {
  console.log(`Serving ${file} (Ctrl+C to stop)`)
  for (const url of [`http://localhost:${String(port)}/`, ...lanUrls(networkInterfaces(), port)])
    console.log(`  ${url}`)
})
