/**
 * Pure logic behind `pnpm roadmap`: orders open GitHub issues by their blocked-by links and
 * P1–P5 labels, and renders ROADMAP.md.
 */

export type Ticket = { number: number; title: string; labels: string[]; blockedBy: number[] }

export type PlannedTicket = Ticket & {
  priority: number
  effectivePriority: number
  status: string
  waitingOn: number[]
  unblocks: number[]
}

const TRIAGE_LABELS = ["needs-triage", "needs-info", "ready-for-agent", "ready-for-human", "wontfix"]

// Tickets without a P label sort after every prioritised one.
export const UNPRIORITISED = 9

export function priorityOf(labels: string[]): number {
  const match = labels.map((l) => /^P([1-9])$/.exec(l)).find((m) => m !== null)
  return match ? Number(match[1]) : UNPRIORITISED
}

export const statusOf = (labels: string[]) => labels.find((l) => TRIAGE_LABELS.includes(l)) ?? "—"

// Blocker → the open tickets it blocks. Blockers that are closed (not in the list) are ignored.
export function dependentsOf(tickets: Ticket[]): Map<number, number[]> {
  const open = new Set(tickets.map((t) => t.number))
  const dependents = new Map<number, number[]>()
  for (const t of tickets)
    for (const b of t.blockedBy.filter((n) => open.has(n)))
      dependents.set(b, [...(dependents.get(b) ?? []), t.number])
  return dependents
}

// A blocker is as urgent as the most urgent ticket it (transitively) unblocks.
export function effectivePriorities(tickets: Ticket[]): Map<number, number> {
  const own = new Map(tickets.map((t) => [t.number, priorityOf(t.labels)]))
  const dependents = dependentsOf(tickets)
  const result = new Map<number, number>()
  const visiting = new Set<number>()

  const resolve = (n: number): number => {
    const known = result.get(n)
    if (known !== undefined) return known
    // a dependency cycle: fall back to the ticket's own priority
    if (visiting.has(n)) return own.get(n) ?? UNPRIORITISED
    visiting.add(n)
    const p = Math.min(own.get(n) ?? UNPRIORITISED, ...(dependents.get(n) ?? []).map(resolve))
    visiting.delete(n)
    result.set(n, p)
    return p
  }

  for (const t of tickets) resolve(t.number)
  return result
}

// Topological order: a ticket comes after its open blockers, ties broken by effective priority then number.
export function planTickets(tickets: Ticket[]): PlannedTicket[] {
  const effective = effectivePriorities(tickets)
  const dependents = dependentsOf(tickets)
  const open = new Set(tickets.map((t) => t.number))
  const rank = (t: Ticket) => (effective.get(t.number) ?? UNPRIORITISED) * 100_000 + t.number

  const remaining = new Map(tickets.map((t) => [t.number, t]))
  const planned: PlannedTicket[] = []
  while (remaining.size > 0) {
    const pending = [...remaining.values()]
    const ready = pending.filter((t) => t.blockedBy.every((b) => !remaining.has(b)))
    // a dependency cycle leaves nothing ready: release the rest in rank order
    const next = (ready.length > 0 ? ready : pending).reduce((best, t) => (rank(t) < rank(best) ? t : best))
    remaining.delete(next.number)
    planned.push({
      ...next,
      priority: priorityOf(next.labels),
      effectivePriority: effective.get(next.number) ?? UNPRIORITISED,
      status: statusOf(next.labels),
      waitingOn: next.blockedBy.filter((b) => open.has(b)),
      unblocks: [...(dependents.get(next.number) ?? [])].sort((a, b) => a - b),
    })
  }
  return planned
}

const priorityLabel = (t: PlannedTicket) => {
  const own = t.priority === UNPRIORITISED ? "—" : `P${String(t.priority)}`
  return t.effectivePriority < t.priority ? `${own} (↑P${String(t.effectivePriority)})` : own
}

// What each P label means: ADR 0024.
const SECTION_TITLES = new Map([
  [1, "P1: broken"],
  [2, "P2: realism in scope"],
  [3, "P3: experience and project health"],
  [4, "P4: parked"],
  [5, "P5: UI and UX"],
  [UNPRIORITISED, "No priority"],
])

// Area labels that sub-divide the parked P4 section, in display order. A new area label is added here and in docs/agents/issue-tracker.md.
export const P4_AREAS = ["electrical", "turbine-aux", "plant-systems", "alarms", "scenario", "project-health"]
const OTHER_AREA = "other"

export const areaOf = (labels: string[]): string => P4_AREAS.find((a) => labels.includes(a)) ?? OTHER_AREA

const sectionTitle = (priority: number) => SECTION_TITLES.get(priority) ?? `P${String(priority)}`

export function renderRoadmap(tickets: Ticket[], repoUrl: string, date: string): string {
  // The plan already runs by effective priority; only a dependency cycle can break that, and the sort restores it.
  const planned = planTickets(tickets).sort((a, b) => a.effectivePriority - b.effectivePriority)
  const link = (n: number) => `[#${String(n)}](${repoUrl}/issues/${String(n)})`
  const links = (ns: number[]) => ns.map(link).join(" ")
  const title = (t: Ticket) => t.title.replaceAll("|", "\\|")

  const row = (t: PlannedTicket) =>
    `| ${String(planned.indexOf(t) + 1)} | ${link(t.number)} ${title(t)} | ${priorityLabel(t)} | ${t.status} | ${links(t.waitingOn)} | ${links(t.unblocks)} |`

  const table = (rows: PlannedTicket[]) => [
    "| # | Ticket | Priority | Status | Waiting on | Unblocks |",
    "| - | ------ | -------- | ------ | ---------- | -------- |",
    ...rows.map(row),
    "",
  ]

  // P4 is split into one sub-table per area label; other priorities are a single table.
  const section = (priority: number) => {
    const rows = planned.filter((t) => t.effectivePriority === priority)
    if (priority !== 4) return [`## ${sectionTitle(priority)}`, "", ...table(rows)]
    const areas = [...P4_AREAS, OTHER_AREA].filter((a) => rows.some((t) => areaOf(t.labels) === a))
    return [
      `## ${sectionTitle(priority)}`,
      "",
      ...areas.flatMap((a) => [`### ${a}`, "", ...table(rows.filter((t) => areaOf(t.labels) === a))]),
    ]
  }

  return [
    "# Roadmap",
    "",
    "<!-- Generated by `pnpm roadmap` from the GitHub issues. Do not edit by hand. -->",
    "",
    `_Updated ${date} · ${String(planned.length)} open tickets_`,
    "",
    "Order: a ticket comes after every open ticket blocking it, otherwise by priority (`P1` first).",
    "A blocker inherits the highest priority of anything it unblocks, shown as `↑P1`, and sits in that priority's section.",
    "Next: the first ticket with nothing under Waiting on.",
    "",
    ...[...new Set(planned.map((t) => t.effectivePriority))].flatMap(section),
  ].join("\n")
}
