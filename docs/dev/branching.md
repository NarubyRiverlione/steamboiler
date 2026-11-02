# Branches and releases

Two long-lived branches. Why: [ADR 0012](../adr/0012-dev-branch-main-for-releases.md); releases by pull request: [ADR 0013](../adr/0013-release-by-pull-request.md).

| Branch | Holds | Who commits |
|---|---|---|
| `dev` | Day-to-day work: features, fixes, docs, `ROADMAP.md` updates | Everyone, agents included |
| `main` | Milestone releases only, via pull request; every merge publishes the app | Only on the owner's explicit say-so |

## Rules

- **Work on `dev`.** Start from `dev`, commit to `dev`. A larger ticket may get its own branch (`<ticket>-<slug>`, e.g. `hotwell-volume-53`), branched from `dev` and merged back into `dev`.
- **Never commit, merge or push to `main`** unless the owner explicitly says so for that release. Approval for one release does not carry over to the next.
- **Release:** open a pull request from `dev` into `main` (`gh pr create --base main --head dev`) and merge it once the `check` job is green. `main` accepts no direct pushes.
- **Fixes go through `dev`** as well; a fix reaches `main` with the next release.

## GitHub settings on `main`

Branch protection, not rulesets: a pull request is required (0 approvals, so the owner can merge their own), the `check` status check must pass with the branch up to date, no force pushes, no deletion. *Enforce for admins* is off, so an admin can still bypass in an emergency.

## CI

`.github/workflows/ci.yml` runs on every push to `dev` and every pull request into `main`. Job `check`: `pnpm install --frozen-lockfile`, `pnpm lint:ci` (eslint without `--fix`, then `tsc -b --noEmit`), `pnpm test` (Vitest runs once under `CI=true`). `check` is the required status check on `main`.

## Deployment

`.github/workflows/main.yml` runs on every push to `main` (and by hand via *workflow_dispatch*): `pnpm install --frozen-lockfile`, `pnpm build`, then publishes `dist/` to GitHub Pages. Vite's base path and the `BrowserRouter` basename come from the environment so the app works under the Pages sub-path. `dev` is not deployed.
