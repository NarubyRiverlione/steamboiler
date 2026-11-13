# Tickets are ordered by theme; only broken and wrong jump the queue

The simulator works, and the project is now expanding it. A linear `P1`–`P5` scale answered "what kind of work is this?" and "what comes next?" with one label, which no longer fits: the expansion is a set of topics (electrical, turbine auxiliaries, alarms, ...), each a small roadmap of its own, and the owner picks which topic to work on. A global rank forced unrelated topics into one queue and made `P4` a dumping ground that needed sub-labels.

- **Theme label:** every ticket gets exactly one theme label saying what part of the project it belongs to: `electrical`, `turbine-aux`, `plant-systems`, `alarms`, `scenario`, `ui`, `sim-core` (tests, CI, tooling, snapshots, scenarios on the existing plant). A new theme is added to the list in `docs/agents/issue-tracker.md` and to the generator. `UI design` stays a label of its own (the UI redo, ADR 0015) next to the theme.
- **Urgency override:** `P1` (broken: a crash, a sim that can't run or can't be trusted, a blocked scenario or deploy) and `P2` (wrong realism: something the plant already has behaves or calculates wrongly) keep their meaning and jump the queue whatever their theme. `P3`, `P4` and `P5` are retired. Cosmetic bugs are simply tickets in the `ui` theme.
- **Parked is a status, not a rank:** a ticket is `needs-triage` (an idea) until the owner promotes it to `ready-for-agent` or `ready-for-human`. Promoting is the owner's decision to widen the scope. The theme label stays.
- **Active theme:** the owner marks a theme as active with an open milestone of the same name, opened when taking the theme up and closed when it is done (the milestone also shows progress). The roadmap lists the active theme first.
- **Order:** inside a theme the order is dependency first (native blocked-by links, ties by ticket number). The next ticket is the first ready, unblocked one among `P1`/`P2` tickets, then the active theme. A blocker pulled in from another theme inherits the position of what it unblocks, as `P` priority used to be inherited.

The line between "wrong" (`P2`) and "new" is one test: does the ticket correct something the plant already has, or add something it doesn't have yet? New behaviour is a themed ticket, never `P2`.

## Considered options

- **Keep `P1`–`P5` and add theme sub-labels (done for `P4` only):** rejected. It sorts themes by a rank that no longer means anything, and sub-dividing one rank at a time leaves the rest flat.
- **Themes only, no `P1`/`P2`:** rejected. A broken sim must beat any theme, and wrong realism must not wait for its theme's turn; a flag is the smallest way to say that.
- **Active theme as a label or a line in `ROADMAP.md`:** rejected. A label is a second thing to keep in step with the theme label, and the roadmap is generated, never edited. A milestone is native, visible on GitHub and carries progress.
- **A global rank inside each theme:** rejected. Blocked-by links already give the order; a rank would be a second source of truth.

## Consequences

- `ROADMAP.md` becomes one section per theme (active first, `P1`/`P2` tickets on top), not one per priority.
- Realism still comes first where it is wrong (`P2`), but a realism *expansion* waits for its theme to be active.
- `P1` and `P2` are empty most of the time.
- Follow-up in one change: the generator and its tests, `docs/agents/issue-tracker.md`, `CLAUDE.md` (Tickets), the `docs/README.md` index line, theme labels on every open ticket, retiring `P3`–`P5` labels.
