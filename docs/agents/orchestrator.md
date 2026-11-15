# Orchestration

Plan to automate the ticket workflow with Orca: a coordinator on the laptop sends ready tickets to the devboxes,
one ticket per box at a time. Status: planned, not started.

## Current setup

- One MacBook running Orca.
- `DevBox` and `devbox-02` (Ubuntu), paired as Orca servers (`orca host list`, `orca environment list`).
- GitHub issues track the work; Matt Pocock skills (`mattpocock-skills` 1.3.1) drive triage and implementation.
- `pnpm roadmap` (`scripts/roadmap.ts`) regenerates `ROADMAP.md` from the GitHub issues: status, order, waiting on,
  unblocks.
- Devboxes are ready to run unattended: `gh auth`, push access to `origin`, skills installed, Claude permission
  allowlist for `pnpm`, `gh`, `git push` and the allowed `npx` command.

## Current manual workflow

- `needs-triage` tickets: `/triage` and/or grilling until the ticket gets `ready-for-agent`.
- `ready-for-agent` tickets: start an Orca task that
  - creates a worktree on the chosen devbox from `origin/dev`,
  - runs `/implement` with the issue number,
  - then: CRAP score on the changed files, all tests, `/close-ticket` (merge into `dev`, close the ticket, remove the
    worktree).

## Goal

- The orchestrator only considers tickets labeled `ready-for-agent` with no open blockers.
- Each such ticket goes to one of the devboxes; one ticket at a time per box.
- When a ticket is done, the laptop pulls `dev`, so the roadmap used to pick the next ticket is always accurate.

## Design

```
Laptop (Orca + coordinator Claude session)
  1. pick:     ready-for-agent, no open blockers, not in-progress, in ROADMAP order (P1/P2 first)
  2. claim:    add the in-progress label so the ticket is never sent twice
  3. dispatch: orca orchestration worker-start --on DevBox|devbox-02
                 --worktree new-top-level --repo <steamboiler on that box> --base-branch origin/dev --agent claude
               worker spec: implement steps → gate → CRAP → close-ticket (merges and pushes origin/dev)
  4. worker_done wakes the coordinator → git pull --ff-only on the laptop's dev → pnpm roadmap → back to 1
```

- **One per box**: the coordinator dispatches only to a box without a live worker (`orchestration worker-list`).
- **No polling**: Orca wakes the coordinator on `worker_done`, a question or an escalation.
- **Idle pickup**: an hourly `orca automations create` job starts a coordinator pass for tickets that become ready
  while both boxes sit idle. Its `--precheck` runs the picker and exits 0 only when a ready ticket exists and a box is
  free, so most hours start no agent.
- **Failures stay with the owner**: a merge conflict, a red gate or a question the spec cannot answer reaches the
  coordinator as an `ask` or an escalation. The coordinator forwards it to the owner and leaves the box idle; no
  automatic retry.

### Skill findings

- **`/implement` cannot be run by a worker.** Its frontmatter has `disable-model-invocation: true`: only a human typing
  `/implement` starts it. An Orca worker's prompt starts with Orca's own preamble, and the model cannot invoke the skill
  itself. The skill is six lines, so the worker spec carries its steps inline:
  1. fetch the ticket and state its title (if the reference is ambiguous, `ask` the coordinator);
  2. work test-first with the `tdd` skill at agreed seams;
  3. typecheck and run single test files regularly, the full suite once at the end;
  4. review with the `code-review` skill;
  5. commit to the ticket branch.

  `tdd` and `code-review` are model-invocable, so they keep working. Alternative: a project copy of `implement` without
  the flag, at the cost of maintaining a fork.
- **`/implement` commits but never merges or pushes**: merging into `dev` and pushing `origin/dev` stay with
  `close-ticket` at the end of the worker spec.
- **`/triage` stays manual on the laptop.** It is interactive (recommend, wait for the owner, grill). Setting
  `ready-for-agent` is the owner's hand-off to the orchestrator.
- **The agent brief is the contract.** Triage posts an agent brief comment when a ticket moves to `ready-for-agent`;
  the worker spec tells the worker to work from that brief, with the issue body as context only.
- **Label names**: triage uses canonical role names mapped to the tracker's labels; the picker matches the actual label
  string triage applies.
- **`in-progress` is outside triage's state machine**: an extra label owned by the orchestrator; triage ignores it.

### Worker spec (template)

- Ticket `#<n>`: read the issue and its agent brief comment; the brief is the contract.
- The `ready-for-agent` label is the owner's go-ahead: do not stop to ask for confirmation before implementing
  (overrides the global "always ask before implementing" rule for this task).
- Implement steps 1–5 above.
- Gate and close: run the `close-ticket` skill for `#<n>` (gate, CRAP report, merge into `dev`, push, close the issue,
  remove the worktree).
- Done means: issue closed, merge commit on `origin/dev`. Report gate results, CRAP scores and flagged methods, and the
  merge commit in `worker_done`. Any failure, conflict or open question: stop and `ask`; do not work around it.

## Prerequisites

1. ~~Roadmap merge conflict~~: done. `close-ticket` no longer regenerates `ROADMAP.md` on the ticket branch; it runs
   `pnpm roadmap` after the issue is closed and commits it straight on `dev` (ADR 0014), regenerating and retrying
   when a push is rejected because another box pushed first.
2. **Deterministic picker.** Add a `pnpm roadmap --next-ready --json` mode to `scripts/roadmap.ts`: the ordered list of
   `ready-for-agent` tickets with no open blockers and no `in-progress` label. The coordinator and the automation's
   precheck both use it; the model never parses `ROADMAP.md`.
3. **`in-progress` label**: create it; `close-ticket` removes it on close (closing the issue is enough for the picker,
   the label then only matters for the roadmap view).
4. ~~Devbox setup~~: done.

## Setup steps

1. Fix the roadmap merge in `close-ticket` and add the picker mode and `in-progress` label, each on its own ticket
   branch.
2. On each devbox, import or clone steamboiler as an Orca project and note its repo selector
   (`orca repo list --environment DevBox --json`).
3. Finalise the worker spec template above.
4. One supervised manual run: the owner starts a coordinator session that sends one ticket to `DevBox`, and watches
   the full cycle.
5. Create the hourly automation with the precheck.

## Risks

- Two tickets that both regenerate `sim/snapshots/` will conflict on merge; `close-ticket` stops and the coordinator
  reports it.
- At the time of writing no ticket is `ready-for-agent` (the roadmap shows mostly `needs-triage`); the first real test
  needs at least one triaged ticket.
