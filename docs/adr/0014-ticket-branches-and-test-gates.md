# Every ticket on its own branch; merges into `dev` and `main` are test gates

[ADR 0012](0012-dev-branch-main-for-releases.md) made `dev` the working branch, with a ticket branch only for larger tickets. Since [ADR 0013](0013-release-by-pull-request.md) nothing is merged into `main` except by pull request from `dev`, so `dev` is the integration branch and committing on it directly skips any check before the work lands. Every ticket now gets its own branch or worktree from `dev` and is merged back locally, without a pull request, and each merge is a test gate on the layers of the test strategy (unit, golden-path scenarios, edge scenarios). This supersedes the "work on `dev`" part of ADR 0012; `main` as the release branch stays. How to work with it: [branching.md](../dev/branching.md).

| Moment | Must pass |
|---|---|
| Every commit | lint and unit tests (known failures are `test.fails` naming a ticket) |
| Ticket branch → `dev` | the above, golden-path scenarios, crap report on the changed files |
| `dev` → `main` | the above and the edge scenarios |

The UI redo (#85, [ADR 0015](0015-ui-redo-analog-board-preferred.md)) first used a temporary `ui` branch; it was dropped and UI tickets go to `dev` like all others.

## Considered options

- **Keep committing on `dev`, gate at ticket close and by CI after the push:** rejected. The check comes after the work is already on the integration branch, and it relies on discipline.
- **Pull request into `dev`, with CI as a required check:** rejected. Too much admin overhead for a sole developer. Pull requests stay for `main` (ADR 0013), where the release record is worth it.
- **A temporary `ui` branch for the UI redo:** tried, then dropped. UI tickets branch from and merge into `dev` like all others.
- **Run every layer at every gate:** rejected. The scenarios take most of the ~55 s suite; unit tests run in under a second and are the only layer cheap enough for every commit.
- **Edge scenarios only at the `main` gate:** run earlier as well. They are cheap from a snapshot, and a regression shows up near the commit that caused it; passing them is only required for `main`.

## Consequences

- A ticket is a branch (`<slug>-<ticket>`), merged into `dev` locally once its gate passes locally; agents never commit ticket work on `dev` directly.
- GitHub cannot block a merge into `dev`; the gate is run locally, and CI on push to `dev` reports afterwards.
- `ROADMAP.md` updates after creating or closing a ticket travel with that ticket's branch.
- The crap report flags methods over the threshold but does not fail the gate, until it is decided whether coverage should count unit tests only.
- The hooks and CI jobs that enforce this are built in #61, after the test layers exist (#60).
