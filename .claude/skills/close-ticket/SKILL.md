---
name: close-ticket
description: Close a finished ticket end to end: run the gate (unless already green), merge the ticket branch or worktree into dev (or ui for UI tickets), close the GitHub issue, remove the branch/worktree. Use when the user runs /close-ticket [ticket#] or says a ticket is done and should be merged and closed.
---

# Close a ticket

Usage: `/close-ticket [ticket#]`. Rules come from `docs/dev/branching.md` and `CLAUDE.md`; if they disagree with this file, they win.
Once the gate is green, run straight through: do not ask for confirmation. Stop and report on any failure, conflict or surprise. Never touch `main`.

## 1. Orient

- Ticket number: the argument, else the trailing number of the current branch (`<slug>-<ticket>`). Ticket branch: `git branch --list "*-<ticket>"`; note whether it lives in a worktree (`git worktree list`).
- Stop if the branch is `main` or `dev`, or if the working tree of the ticket branch is dirty.
- Target: `dev`.

## 2. Gate (skip a step only if it already passed in this session on the current HEAD)

- `pnpm lint`
- `pnpm test:unit`
- `pnpm test:sim:golden`; for a UI ticket the snapshots must stay unchanged (`git status` clean after the run, no `sim/snapshots/` diff).
- ADRs: `git grep "#<ticket>" docs/adr`; update every ADR the ticket made out of date. Reference docs in `docs/plant/` or `docs/dev/` must match the change.
- CRAP: run the `crap-score-typescript` skill on the files the ticket changed: list them with `git diff --name-only dev...HEAD -- '*.ts' '*.tsx'` and pass them as file paths. Never use `--changed` (it only sees uncommitted changes, and the work is already committed). Report the scores; flag any method above the risk threshold (flag only, does not fail).
- Commit any ADR or doc change on the ticket branch. Then re-run the tests the change could affect. The ticket branch never touches `ROADMAP.md` (ADR 0014), and closing a ticket does not regenerate it either: that gave merge conflicts. It is regenerated only when a new ticket is created.

## 3. Sync and merge

- Target current: `git fetch origin`. If `origin/<target>` is ahead of local `<target>`, fast-forward it first (`git -C <main checkout> checkout <target> && git pull --ff-only`). If it has diverged, stop.
- If the target gained commits since the ticket branched, merge the target into the ticket branch (merge commit, no rebase), then re-run the gate.
- In the main checkout: `git checkout <target> && git merge --no-ff <branch>`. On conflicts: stop and ask.
- `git push origin <target>`.

## 4. Close

- `gh issue close <n> --comment "<gate results, CRAP scores and flagged methods, merge commit>"`.
- Stale briefs: list what the ticket changed (`git diff --name-only <merge>^1 <merge>`), in particular the ADRs in `docs/adr/`. For each open `ready-for-agent` ticket (`gh issue list --label ready-for-agent --state open`), check whether its brief names one of those ADRs or the same code area, and whether the brief still holds. Move each ticket whose brief is now out of date back to `needs-triage` (`gh issue edit <m> --remove-label ready-for-agent --add-label needs-triage`), and comment a one-line reason naming this ticket. Don't regenerate `ROADMAP.md`.

## 5. Clean up

- Worktree: `git worktree remove <path>` first (never `--force` without asking).
- `git branch -d <branch>` (safe delete; if it refuses, stop and report). Delete the remote branch only if it exists: `git push origin --delete <branch>`.

## 6. Report

One short summary: gate results, CRAP scores, merge commit, issue closed, tickets moved back to `needs-triage` (with reasons), what was removed.
