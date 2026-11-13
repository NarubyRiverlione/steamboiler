/**
 * Pure logic behind `pnpm roadmap`: orders open GitHub issues by their blocked-by links, the
 * P1/P2 urgency labels and their theme label (ADR 0024), and renders ROADMAP.md.
 */

export type Ticket = { number: number; title: string; labels: string[]; blockedBy: number[] }

export type PlannedTicket = Ticket & {
  priority: number
  effectivePriority: number
  theme: string
  status: string
  waitingOn: number[]
  unblocks: number[]
}

const TRIAGE_LABELS = ["needs-triage", "needs-info", "ready-for-agent", "ready-for-human", "wontfix"]

// Tickets without a P label sort after every prioritised one.
export const UNPRIORITISED = 9

// Only P1 (broken) and P2 (wrong) are urgent; every other ticket sits at the normal level and is ordered by theme.
export const URGENT = 2
export const NORMAL = 3

// Themes in display order (ADR 0024). A new theme is added here and in docs/agents/issue-tracker.md.
export const THEMES = [
  { name: "electrical", title: "Electrical: auxiliary load, grid supply, vital bus, UPS" },
  { name: "turbine-aux", title: "Turbine auxiliaries: lube oil, turning gear, gland steam" },
  { name: "plant-systems", title: "Plant systems: components and physics expansion" },
  { name: "alarms", title: "Alarms and trips" },
  { name: "scenario", title: "Scenarios" },
  { name: "ui", title: "UI and UX" },
  { name: "sim-core", title: "Sim core: tests, CI, tooling, snapshots" },
]
const NO_THEME = "no theme"

export const themeOf = (labels: string[]): string =>
  THEMES.find((t) => labels.includes(t.name))?.name ?? NO_THEME

const urgencyOf = (labels: string[]): number => Math.min(priorityOf(labels), NORMAL)

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
  const own = new Map(tickets.map((t) => [t.number, urgencyOf(t.labels)]))
  const dependents = dependentsOf(tickets)
  const result = new Map<number, number>()
  const visiting = new Set<number>()

  const resolve = (n: number): number => {
    const known = result.get(n)
    if (known !== undefined) return known
    // a dependency cycle: fall back to the ticket's own priority
    if (visiting.has(n)) return own.get(n) ?? NORMAL
    visiting.add(n)
    const p = Math.min(own.get(n) ?? NORMAL, ...(dependents.get(n) ?? []).map(resolve))
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
  const themeRank = (t: Ticket) =>
    THEMES.findIndex((th) => th.name === themeOf(t.labels)) + 1 || THEMES.length + 1
  const rank = (t: Ticket) =>
    (effective.get(t.number) ?? NORMAL) * 10_000_000 + themeRank(t) * 100_000 + t.number

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
      effectivePriority: effective.get(next.number) ?? NORMAL,
      theme: themeOf(next.labels),
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

export function renderRoadmap(tickets: Ticket[], repoUrl: string, date: string): string {
  // The plan already runs urgent first, then by theme; only a dependency cycle can break that, and the sort restores it.
  const planned = planTickets(tickets).sort((a, b) => a.effectivePriority - b.effectivePriority)
  const link = (n: number) => `[#${String(n)}](${repoUrl}/issues/${String(n)})`
  const links = (ns: number[]) => ns.map(link).join(" ")
  const title = (t: Ticket) => t.title.replaceAll("|", "\\|")
  const isReady = (t: PlannedTicket) => t.status.startsWith("ready-") && t.waitingOn.length === 0
  const next = (rows: PlannedTicket[]) => rows.find(isReady)

  const urgentRow = (t: PlannedTicket) =>
    `| ${String(planned.indexOf(t) + 1)} | ${link(t.number)} ${title(t)} | ${priorityLabel(t)} | ${t.theme} | ${t.status} | ${links(t.waitingOn)} | ${links(t.unblocks)} |`
  const themeRow = (t: PlannedTicket) =>
    `| ${String(planned.indexOf(t) + 1)} | ${link(t.number)} ${title(t)} | ${t.status} | ${links(t.waitingOn)} | ${links(t.unblocks)} |`

  const urgent = planned.filter((t) => t.effectivePriority <= URGENT)
  const urgentSection = [
    "## Broken or wrong (P1, P2)",
    "",
    "| # | Ticket | Priority | Theme | Status | Waiting on | Unblocks |",
    "| - | ------ | -------- | ----- | ------ | ---------- | -------- |",
    ...urgent.map(urgentRow),
    "",
  ]

  const themeSection = (name: string, heading: string) => {
    const rows = planned.filter((t) => t.effectivePriority > URGENT && t.theme === name)
    const pick = next(rows)
    return [
      `## ${heading}`,
      "",
      pick
        ? `Next: ${link(pick.number)} ${title(pick)}`
        : "Next: nothing ready (every ticket is waiting or needs triage).",
      "",
      "| # | Ticket | Status | Waiting on | Unblocks |",
      "| - | ------ | ------ | ---------- | -------- |",
      ...rows.map(themeRow),
      "",
    ]
  }

  const themeHeadings = [...THEMES.map((t) => [t.name, t.title]), [NO_THEME, "No theme"]]
  const shown = themeHeadings.filter(([name]) =>
    planned.some((t) => t.effectivePriority > URGENT && t.theme === name),
  )
  const pickUrgent = next(urgent)

  return [
    "# Roadmap",
    "",
    "<!-- Generated by `pnpm roadmap` from the GitHub issues. Do not edit by hand. -->",
    "",
    `_Updated ${date} · ${String(planned.length)} open tickets_`,
    "",
    "Order: a ticket comes after every open ticket blocking it. Broken or wrong tickets (`P1`, `P2`) come first, whatever their theme;",
    "the rest are grouped by theme, with no theme marked active: pick the theme that suits the moment (ADR 0024).",
    "A blocker of a `P1`/`P2` ticket inherits that urgency, shown as `↑P1`, and sits in the top section.",
    pickUrgent
      ? `Next: ${link(pickUrgent.number)} ${title(pickUrgent)}, then the next ticket of the theme you pick.`
      : "Next: the first ready ticket with nothing under Waiting on, in the theme you pick.",
    "",
    ...(urgent.length > 0 ? urgentSection : []),
    ...shown.flatMap(([name, heading]) => themeSection(name, heading)),
  ].join("\n")
}
