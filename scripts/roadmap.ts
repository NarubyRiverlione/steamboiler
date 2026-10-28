import { execFile } from "node:child_process"
import { writeFile } from "node:fs/promises"
import process from "node:process"
import { promisify } from "node:util"
import { renderRoadmap, Ticket } from "./roadmap-helpers"

// usage: pnpm roadmap [ROADMAP.md]
// Reads the open issues and their blocked-by links via `gh` and rewrites the roadmap.
const out = process.argv[2] ?? "ROADMAP.md"
const run = promisify(execFile)

async function gh<T>(args: string[]): Promise<T> {
  const { stdout } = await run("gh", args)
  return JSON.parse(stdout) as T
}

type Issue = { number: number; title: string; labels: { name: string }[] }
type Blocker = { number: number; state: string }

const { nameWithOwner } = await gh<{ nameWithOwner: string }>(["repo", "view", "--json", "nameWithOwner"])
const issues = await gh<Issue[]>([
  "issue",
  "list",
  "--state",
  "open",
  "--limit",
  "500",
  "--json",
  "number,title,labels",
])

const tickets: Ticket[] = await Promise.all(
  issues.map(async (issue) => {
    const blockers = await gh<Blocker[]>([
      "api",
      `repos/${nameWithOwner}/issues/${String(issue.number)}/dependencies/blocked_by`,
    ])
    return {
      number: issue.number,
      title: issue.title,
      labels: issue.labels.map((l) => l.name),
      blockedBy: blockers.filter((b) => b.state === "open").map((b) => b.number),
    }
  }),
)

const date = new Date().toISOString().slice(0, 10)
await writeFile(out, renderRoadmap(tickets, `https://github.com/${nameWithOwner}`, date))
console.log(`Wrote ${out} (${String(tickets.length)} open tickets)`)
