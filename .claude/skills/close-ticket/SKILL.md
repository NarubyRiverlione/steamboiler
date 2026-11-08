---
name: close-ticket
description: Close a finished ticket end to end: run the gate (unless already green), merge the ticket branch or worktree into dev (or ui for UI tickets), close the GitHub issue, remove the branch/worktree. Use when the user runs /close-ticket [ticket#] or says a ticket is done and should be merged and closed.
---

# Close a ticket

Usage: `/close-ticket [ticket#]`. Rules come from `docs/dev/branching.md` and `CLAUDE.md`; if they disagree with this file, they win.
Once the gate is green, run straight through: do not ask for confirmation. Stop and report on any failure, conflict or surprise. Never touch `main`.

## 1. Orient

- Ticket number: the argument, else the trailing number of the current branch (`<slug>-<ticket>`). Ticket branch: `git branch --list "*-<ticket>"`; note whether it lives in a worktree (`git worktree list`).
- Stop if the branch is `main`, `dev` or `ui`, or if the working tree of the ticket branch is dirty.
- Target: `ui` if the issue has the `UI design` label (`gh issue view <n> --json labels`), otherwise `dev`.

## 2. Gate (skip a step only if it already passed in this session on the current HEAD)

- `pnpm lint`
- `pnpm test:unit`
- `pnpm test:sim:golden`; for a UI ticket the snapshots must stay unchanged (`git status` clean after the run, no `sim/snapshots/` diff).
- ADRs: `git grep "#<ticket>" docs/adr`; update every ADR the ticket made out of date. Reference docs in `docs/plant/` or `docs/dev/` must match the change.
- CRAP: run the `crap-score-typescript` skill with `--changed`. Report the scores; flag any method above the risk threshold (flag only, does not fail).
- Roadmap: `pnpm roadmap`.
- Commit any ADR, doc or `ROADMAP.md` change on the ticket branch. Then re-run the tests the change could affect.

## 3. Sync and merge

- Target current: `git fetch origin`. If `origin/<target>` is ahead of local `<target>`, fast-forward it first (`git -C <main checkout> checkout <target> && git pull --ff-only`). If it has diverged, stop.
- If the target gained commits since the ticket branched, merge the target into the ticket branch (merge commit, no rebase), then re-run the gate. For a UI ticket, always merge `dev` into `ui` first (pull `dev` before that), as the policy says.
- In the main checkout: `git checkout <target> && git merge --no-ff <branch>`. On conflicts: stop and ask.
- `git push origin <target>`.

## 4. Close

- `gh issue close <n> --comment "<gate results, CRAP scores and flagged methods, merge commit>"`.

## 5. Clean up

- Worktree: `git worktree remove <path>` first (never `--force` without asking).
- `git branch -d <branch>` (safe delete; if it refuses, stop and report). Delete the remote branch only if it exists: `git push origin --delete <branch>`.

## 6. Report

One short summary: gate results, CRAP scores, merge commit, issue closed, what was removed.
