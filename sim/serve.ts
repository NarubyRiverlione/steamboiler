import { readFile } from "node:fs/promises"
import { createServer } from "node:http"
import { networkInterfaces } from "node:os"
import process from "node:process"
import { lanUrls, respond } from "./serve-helpers"

// usage: pnpm sim:serve [report.html]   (PORT env, default 4174)
// Serves the report on all interfaces so it can be browsed from another machine.
const file = process.argv[2] ?? "report.html"
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
