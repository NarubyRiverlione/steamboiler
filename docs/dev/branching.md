# Branches and releases

Two long-lived branches plus one short-lived branch per ticket. Why: [ADR 0012](../adr/0012-dev-branch-main-for-releases.md) (`main` for releases), [ADR 0013](../adr/0013-release-by-pull-request.md) (releases by pull request), [ADR 0014](../adr/0014-ticket-branches-and-test-gates.md) (ticket branches and test gates).

| Branch | Holds | Who commits |
|---|---|---|
| `<slug>-<ticket>` (e.g. `hotwell-volume-53`) | One ticket's work, branched from `dev` (a branch or a worktree) | Everyone, agents included |
| `dev` | Integration: merged tickets only | Nobody directly; ticket branches are merged in locally |
| `main` | Milestone releases only, via pull request; every merge publishes the app | Only on the owner's explicit say-so |

## Rules

- **One ticket, one branch.** Start every ticket on its own branch or worktree from `dev`; commit there, never on `dev` itself. Run the gate below locally, then merge back into `dev` locally (no pull request: too much overhead for a sole developer) and push `dev`.
- **Never commit, merge or push to `main`** unless the owner explicitly says so for that release. Approval for one release does not carry over to the next.
- **Release:** open a pull request from `dev` into `main` (`gh pr create --base main --head dev`) and merge it once its gate is green. `main` accepts no direct pushes.
- **Fixes go through a ticket branch and `dev`** as well; a fix reaches `main` with the next release.

## Gates

Each gate includes everything of the one above it. Test layers: unit (`src/` and sim tooling), golden-path scenarios, edge scenarios (#60).

| Moment | Must pass |
|---|---|
| Every commit | lint, unit tests; known failures are `test.fails` naming a ticket |
| Ticket branch → `dev` | golden-path scenarios, crap report on the changed files (flags methods over the threshold, does not fail) |
| `dev` → `main` | edge scenarios |

The `dev` gate is run locally before the merge; GitHub cannot block a merge into `dev`. CI on every push to `dev` runs the layers again, edge included (reported, not required), so a regression shows near the commit that caused it. The `main` gate is the required check on the pull request.

Not enforced yet: the hooks and the CI jobs per layer come with #61, after the test layers of #60. Until then, run `pnpm lint` and `pnpm test` before every merge.

## GitHub settings on `main`

Branch protection, not rulesets: a pull request is required (0 approvals, so the owner can merge their own), the `check` status check must pass with the branch up to date, no force pushes, no deletion. *Enforce for admins* is off, so an admin can still bypass in an emergency.

## CI

`.github/workflows/ci.yml` runs on every push to `dev` and every pull request into `main`. Job `check`: `pnpm install --frozen-lockfile`, `pnpm lint:ci` (eslint without `--fix`, then `tsc -b --noEmit`), `pnpm test` (Vitest runs once under `CI=true`). `check` is the required status check on `main`.

## Deployment

`.github/workflows/main.yml` runs on every push to `main` (and by hand via *workflow_dispatch*): `pnpm install --frozen-lockfile`, `pnpm build`, then publishes `dist/` to GitHub Pages. Vite's base path and the `BrowserRouter` basename come from the environment so the app works under the Pages sub-path. `dev` is not deployed.
