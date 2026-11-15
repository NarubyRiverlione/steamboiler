# Orchestration

Plan to automate the ticket workflow with Orca: a coordinator (on the laptop or a headless server, see
[Where the coordinator runs](#where-the-coordinator-runs)) sends ready tickets to the devboxes, one ticket per box at a
time. Status: parked ([parked.md](../parked.md)); its prerequisite tickets #154 and #155 are closed as not planned.

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
Coordinator host: laptop or headless server (Orca + coordinator Claude session)
  1. pick:     ready-for-agent, no open blockers, not in-progress, in ROADMAP order (P1/P2 first)
  2. claim:    add the in-progress label so the ticket is never sent twice
  3. dispatch: orca orchestration worker-start --on DevBox|devbox-02
                 --worktree new-top-level --repo <steamboiler on that box> --base-branch origin/dev --agent claude
               worker spec: implement steps → gate → CRAP → close-ticket (merges and pushes origin/dev)
  4. worker_done wakes the coordinator → git pull --ff-only on the host's dev → back to 1
```

- **One per box**: the coordinator dispatches only to a box without a live worker (`orchestration worker-list`).
- **No polling**: Orca wakes the coordinator on `worker_done`, a question or an escalation.
- **Idle pickup**: an hourly `orca automations create` job starts a coordinator pass for tickets that become ready
  while both boxes sit idle. Its `--precheck` runs the picker and exits 0 only when a ready ticket exists and a box is
  free, so most hours start no agent.
- **Failures stay with the owner**: a merge conflict, a red gate or a question the spec cannot answer reaches the
  coordinator as an `ask` or an escalation. The coordinator forwards it to the owner and leaves the box idle; no
  automatic retry.

### Where the coordinator runs

The coordinator does not need the laptop. Two options:

- **Laptop** (Orca desktop app): works today; dispatch to paired servers is proven from here. The laptop must stay
  awake, and it pulls `dev` after every finished ticket.
- **Headless Ubuntu server** (preferred once verified): `orca serve` runs the Orca runtime without a window, as the
  devboxes already do. Every orchestration command is CLI (`worker-start`, `send`, `reply`, `worker-list`,
  `automations create`); the hourly automation launches the coordinator agent (`--provider claude`) in an Orca
  terminal on that server, and Orca wakes it there.
  - Runs independently of the laptop. The laptop pairs with it like any other server, to watch the coordinator chat or
    answer an escalation.
  - The orchestrator pulls its own checkout of `dev` before each pick (the picker reads GitHub directly anyway); the
    laptop pulls only when the owner wants to look.
  - Needs `gh auth`, git access, Claude Code with the `orchestration` skill, `pnpm` (for the picker) and pairing codes
    from `DevBox` and `devbox-02` (`orca environment add`). It never runs tests, so a small machine is enough.
  - Fallback without a new machine: `DevBox` coordinates, dispatching to itself (new top-level worktree) and to
    `devbox-02`. A separate server is cleaner: the coordinator never shares a box with a worker's test run.
  - **Unverified**: dispatch from a headless runtime to another paired server (`worker-start --on <server>`), and
    mail waking a coordinator no app is showing. Both are tested first (setup step 1); a failure is an Orca bug report,
    not a design change.

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

## Alternatives to Orca

Only the workers need an agent; the coordinator's loop (pick, dispatch to a free box, react to the result) is
deterministic. Every alternative shares the same pieces: the picker (#155), the `in-progress` label (#154), the fixed
`close-ticket` and the worker spec.

- **Worker command**: `claude -p "/implement <n>"`, then `claude -p "/close-ticket <n>"`, in a worktree from
  `origin/dev`. In headless `-p` mode the prompt is user input, so a leading `/implement` starts the skill: the Matt
  Pocock skills work unchanged (the `disable-model-invocation` problem is specific to Orca's preamble).
- **No mid-run ask/reply**: a stuck worker posts its question as an issue comment and swaps `in-progress` for
  `needs-info`; the owner answers and sets `ready-for-agent` again, which requeues the ticket.

| Option | How | Pros | Cons |
| - | - | - | - |
| **GitHub Actions + self-hosted runners** (preferred) | One runner per devbox. Adding `ready-for-agent` or closing an issue triggers a workflow: picker, then Claude Code on a free runner. | One runner per box enforces one ticket per box. Event-driven, no polling. Logs and failures sit in GitHub next to the issue. No orchestrator machine. | A Claude token as a repo secret (`claude setup-token`). Runner setup. |
| **Script + systemd timer** on a small server | Bash/TS: picker, find a box without a live ticket, `ssh devbox "claude -p ..."`, notify via ntfy or Telegram. | Fewest moving parts, fully owned. | Own bookkeeping: busy boxes, timeouts, runs that die halfway. |
| **Hermes Agent** (Nous Research) | Hermes on a server with its scheduler and SSH backend runs `claude -p` on the devboxes and reports in chat. | Chat escalation, scheduler and SSH built in. | A second agent with its own model and bill to run a deterministic loop. Fast-moving project. |
| **OpenClaw** | A server-side gateway whose coding-agent skill delegates to Claude Code. | Large skill ecosystem, chat front-ends. | Same overhead. Community reports warn about using a Claude plan login inside it: check Anthropic's terms. Vet its skill marketplace before installing. |

Claude Code routines (`/schedule`) run in Anthropic's cloud, not on the devboxes, so they do not fit.

### GitHub Actions design

GitHub Actions is the orchestrator: event triggers, a job queue, and one runner per devbox that runs one job at a time.
Nothing runs on the laptop, and no laptop pull is needed: the picker reads GitHub directly.

- **Order**: a runner takes whatever job is queued; it knows no order. The picker decides it: every run starts with
  `pnpm roadmap --next-ready --json` and takes the first ticket (roadmap order, `P1`/`P2` first).
- **Race conditions** in a naive version: two runs starting together both read the same first ticket before either
  claims it; and GitHub's runner "busy" flag lags between assignment and job start, so a busy box can look free.

Fix: two jobs per run.

```
pick   (GitHub-hosted, concurrency: { group: pick, cancel-in-progress: false })
       → one pick at a time, across all triggers
       → free boxes = boxes with no open ticket labeled box:<name>
       → ticket     = first entry of the picker
       → claim:       add in-progress + box:devbox (or box:devbox-02)
       → outputs:     ticket number, box
work   (needs: pick, runs-on: [self-hosted, <box>])
       → worktree from origin/dev, claude -p "/implement N", claude -p "/close-ticket N"
       → on any end: remove box:<name> (frees the box; the ticket keeps its own state)
```

- **Serialized pick**: the only step that reads and claims runs one at a time, so a second pick sees the first one's
  labels.
- **Labels are the truth for busy boxes**, not the runner status: `box:<name>` is set inside the serialized pick and
  cannot lag.
- **Box and ticket are released separately**: a failed run frees the box but leaves the ticket `in-progress` or
  `needs-info`, so it is not picked again; a usage-limit failure returns the ticket to `ready-for-agent`.

Triggers:

- `issues: labeled` with `ready-for-agent`: a new ticket is ready.
- `workflow_run` on completion of the work workflow: a box became free. Actions done with the default `GITHUB_TOKEN`
  (closing the issue, for example) do not trigger other workflows, so chaining on `workflow_run` avoids a personal
  access token.
- `schedule` (for example hourly): safety net and the retry after a usage-limit reset.
- `workflow_dispatch`: manual kick.

Security: the repo is public, and GitHub advises against self-hosted runners on public repos; `ci.yml` runs on
`pull_request`, so a fork's pull request could run code on a devbox if a workflow ever targeted `self-hosted`.

- Only `issues`, `workflow_run`, `schedule` and `workflow_dispatch` reach the self-hosted runners, never
  `pull_request`.
- Labels can only be set by users with triage rights (today only the owner).
- The runners get a dedicated label (`steamboiler-agent`); `ci.yml` stays on `ubuntu-latest`, with a comment (or a
  check) guarding that.
- "Require approval for fork pull request workflows" is enabled.
- A private repo would remove the risk, but GitHub Pages on a private repo needs a paid plan.

Compared with Orca: no mid-run ask/reply (questions go into issue comments) and no live chat view; in return an
always-on coordinator with no machine to host, and every run's log next to its issue.

## Usage and billing

State as of 2026-11-15 (support.claude.com: "Use the Claude Agent SDK with your Claude plan", "Monthly API credits for
Max, Ultra, and Team plans"):

- Signed in with the Claude plan, `claude -p` and the Agent SDK draw from the **plan's limits**. The split announced
  for 2026-06-15 (headless usage onto a separate credit) was paused that day, with no new date.
- Since 2026-10-07, Max, Ultra and Team plans include monthly API credits. They apply only when `claude -p` or the
  Agent SDK runs with an **API key from a linked Console organization**.
- Runs from the Claude Code GitHub Action count as Claude Code (plan) usage, even with `-p`; API credits do not cover
  them.

Consequences:

1. **One quota for everything**: two unattended workers share the plan's limits with the owner's interactive sessions;
   two tickets at once can use up a 5-hour window.
2. **A run at the limit fails instead of waiting**: non-interactive `claude -p` does not pause until the reset. The
   coordinator treats a usage-limit failure as "retry later", not a failed ticket: it keeps `in-progress` and requeues
   the ticket after the reset instead of escalating.
3. **Separate pool**: running workers with a Console API key moves them onto the monthly API credits (Max, Ultra or
   Team only) and keeps the plan limits for interactive work.
4. **Switchable auth**: the paused change may resume, so the worker's auth (plan login or API key) is one setting.

## Prerequisites

1. ~~Roadmap merge conflict~~: done. `close-ticket` no longer regenerates `ROADMAP.md` on the ticket branch; it runs
   `pnpm roadmap` after the issue is closed and commits it straight on `dev` (ADR 0014), regenerating and retrying
   when a push is rejected because another box pushed first.
2. **Deterministic picker** (#155). Add a `pnpm roadmap --next-ready --json` mode to `scripts/roadmap.ts`: the ordered list of
   `ready-for-agent` tickets with no open blockers and no `in-progress` label. The coordinator and the automation's
   precheck both use it; the model never parses `ROADMAP.md`.
3. **`in-progress` label** (#154): create it; `close-ticket` removes it on close (closing the issue is enough for the picker,
   the label then only matters for the roadmap view).
4. ~~Devbox setup~~: done.

## Setup steps

1. Headless test (only for the server option): on the orchestrator server, `orca serve`, pair `DevBox` with
   `orca environment add`, then start a trivial worker with `orchestration worker-start --on DevBox` from an agent in
   an Orca terminal there, and check that its `worker_done` wakes that agent. Pass: coordinate from the server; fail:
   coordinate from the laptop and report the gap to Orca.
2. Finish the prerequisites: `in-progress` label (#154), picker (#155).
3. On each devbox, import or clone steamboiler as an Orca project and note its repo selector
   (`orca repo list --environment DevBox --json`).
4. Finalise the worker spec template above.
5. One supervised manual run: the owner starts a coordinator session that sends one ticket to `DevBox`, and watches
   the full cycle.
6. Create the hourly automation with the precheck, on the coordinator's host.

## Risks

- Two tickets that both regenerate `sim/snapshots/` will conflict on merge; `close-ticket` stops and the coordinator
  reports it.
- At the time of writing no ticket is `ready-for-agent` (the roadmap shows mostly `needs-triage`); the first real test
  needs at least one triaged ticket.
