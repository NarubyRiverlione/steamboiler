import { describe, expect, test } from "vitest"
import {
  dependentsOf,
  effectivePriorities,
  planTickets,
  priorityOf,
  renderRoadmap,
  statusOf,
  themeOf,
  Ticket,
  UNPRIORITISED,
} from "./roadmap-helpers"

const ticket = (number: number, labels: string[] = [], blockedBy: number[] = []): Ticket => ({
  number,
  title: `Ticket ${String(number)}`,
  labels,
  blockedBy,
})

const order = (tickets: Ticket[]) => planTickets(tickets).map((t) => t.number)

describe("priorityOf", () => {
  test("reads the P label", () => {
    expect(priorityOf(["bug", "P2"])).toBe(2)
  })

  test("ignores look-alikes and defaults to unprioritised", () => {
    expect(priorityOf(["P10", "XP1"])).toBe(UNPRIORITISED)
    expect(priorityOf([])).toBe(UNPRIORITISED)
  })
})

describe("statusOf", () => {
  test("picks the triage label", () => {
    expect(statusOf(["P1", "ready-for-agent"])).toBe("ready-for-agent")
  })

  test("shows a dash without one", () => {
    expect(statusOf(["P1"])).toBe("—")
  })
})

describe("dependentsOf", () => {
  test("inverts blocked-by and drops closed blockers", () => {
    const deps = dependentsOf([ticket(1), ticket(2, [], [1, 99]), ticket(3, [], [1])])
    expect(deps.get(1)).toEqual([2, 3])
    expect(deps.has(99)).toBe(false)
  })
})

describe("effectivePriorities", () => {
  test("a blocker inherits the priority of what it transitively unblocks", () => {
    const p = effectivePriorities([ticket(1, ["P3"]), ticket(2, ["P2"], [1]), ticket(3, ["P1"], [2])])
    expect([p.get(1), p.get(2), p.get(3)]).toEqual([1, 1, 1])
  })

  test("survives a cycle", () => {
    const p = effectivePriorities([ticket(1, ["P2"], [2]), ticket(2, ["P3"], [1])])
    expect(p.get(1)).toBe(2)
    expect(p.get(2)).toBe(2)
  })
})

describe("planTickets", () => {
  test("orders unblocked tickets by priority, then number", () => {
    expect(order([ticket(5, ["P2"]), ticket(3, ["P2"]), ticket(9, ["P1"]), ticket(1)])).toEqual([9, 3, 5, 1])
  })

  test("never places a ticket before its open blockers", () => {
    expect(order([ticket(1, ["P1"], [2]), ticket(2, ["P3"]), ticket(3, ["P2"])])).toEqual([2, 1, 3])
  })

  test("ignores blockers that are already closed", () => {
    expect(order([ticket(2, ["P2"]), ticket(1, ["P1"], [42])])).toEqual([1, 2])
  })

  test("still emits every ticket when blockers form a cycle", () => {
    expect(order([ticket(1, ["P1"], [2]), ticket(2, ["P1"], [1])])).toEqual([1, 2])
  })

  test("records what each ticket waits on and unblocks", () => {
    const [first, second] = planTickets([ticket(1, ["P1", "needs-info"]), ticket(2, ["P2"], [1])])
    expect(first).toMatchObject({ status: "needs-info", waitingOn: [], unblocks: [2] })
    expect(second).toMatchObject({ priority: 2, effectivePriority: 2, waitingOn: [1], unblocks: [] })
  })
})

describe("themeOf", () => {
  test("picks the theme label and falls back to no theme", () => {
    expect(themeOf(["enhancement", "turbine-aux"])).toBe("turbine-aux")
    expect(themeOf(["enhancement"])).toBe("no theme")
  })
})

describe("planTickets by theme", () => {
  test("orders normal tickets by theme list order, then number", () => {
    expect(order([ticket(1, ["sim-core"]), ticket(2, ["ui"]), ticket(3, ["electrical"]), ticket(4)])).toEqual(
      [3, 2, 1, 4],
    )
  })

  test("urgent tickets come before every theme", () => {
    expect(order([ticket(1, ["electrical"]), ticket(2, ["sim-core", "P2"])])).toEqual([2, 1])
  })
})

describe("renderRoadmap", () => {
  const md = renderRoadmap(
    [
      { ...ticket(6, ["P2", "needs-info", "sim-core"]), title: "Steam | water" },
      ticket(8, ["P1", "plant-systems"], [6]),
      ticket(15, ["ui", "ready-for-agent"]),
      ticket(16, ["electrical", "needs-triage"]),
      ticket(17, ["electrical", "ready-for-agent"], [16]),
      ticket(18),
    ],
    "https://github.com/o/r",
    "2026-10-28",
  )
  const headings = md.split("\n").filter((l) => l.startsWith("## "))

  test("puts urgent tickets on top and then one section per used theme in list order", () => {
    expect(headings).toEqual([
      "## Broken or wrong (P1, P2)",
      "## Electrical: auxiliary load, grid supply, vital bus, UPS",
      "## UI and UX",
      "## No theme",
    ])
  })

  test("a blocker of an urgent ticket inherits the urgency and shows its theme", () => {
    expect(md).toContain(
      "| 1 | [#6](https://github.com/o/r/issues/6) Steam \\| water | P2 (↑P1) | sim-core | needs-info |  | [#8](https://github.com/o/r/issues/8) |",
    )
    expect(md).toContain(
      "| 2 | [#8](https://github.com/o/r/issues/8) Ticket 8 | P1 | plant-systems | — | [#6](https://github.com/o/r/issues/6) |  |",
    )
  })

  test("names the next ready, unblocked ticket of a theme", () => {
    expect(md).toContain("Next: [#15](https://github.com/o/r/issues/15) Ticket 15")
  })

  test("says when a theme has nothing ready", () => {
    expect(md).toContain("Next: nothing ready")
  })

  test("a ready ticket waiting on a blocker is not the next one", () => {
    const section = md.slice(md.indexOf("## Electrical"), md.indexOf("## UI"))
    expect(section).toContain("Next: nothing ready")
  })

  test("numbers follow the work order across sections", () => {
    const numbers = md
      .split("\n")
      .filter((l) => /^\| \d/.test(l))
      .map((l) => Number(l.split(" ")[1]))
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6])
  })

  test("skips the urgent section when nothing is urgent", () => {
    expect(renderRoadmap([ticket(1, ["ui"])], "u", "d")).not.toContain("## Broken or wrong")
  })

  test("still lists every ticket once when blockers form a cycle", () => {
    const cycle = [ticket(1, ["P1"], [2]), ticket(2, ["ui"], [1]), ticket(3, ["electrical"])]
    const numbers = renderRoadmap(cycle, "u", "d")
      .split("\n")
      .filter((l) => /^\| \d/.test(l))
      .map((l) => Number(l.split(" ")[1]))
    expect([...numbers].sort()).toEqual([1, 2, 3])
  })

  test("stamps the date and count", () => {
    expect(md).toContain("_Updated 2026-10-28 · 6 open tickets_")
  })
})
