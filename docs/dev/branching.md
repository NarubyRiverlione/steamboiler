# Branches and releases

Two long-lived branches. Why: [ADR 0012](../adr/0012-dev-branch-main-for-releases.md).

| Branch | Holds | Who commits |
|---|---|---|
| `dev` | Day-to-day work: features, fixes, docs, `ROADMAP.md` updates | Everyone, agents included |
| `main` | Milestone releases only; every push publishes the app | Only on the owner's explicit say-so |

## Rules

- **Work on `dev`.** Start from `dev`, commit to `dev`. A larger ticket may get its own branch (`<ticket>-<slug>`, e.g. `hotwell-volume-53`), branched from `dev` and merged back into `dev`.
- **Never commit, merge or push to `main`** unless the owner explicitly says so for that release. Approval for one release does not carry over to the next.
- **Release:** merge `dev` into `main` (`git switch main && git merge dev && git push`), then switch back to `dev`. Before the merge `pnpm test` and `pnpm lint` pass on `dev`.
- **Fixes go through `dev`** as well; a fix reaches `main` with the next release.

## Deployment

`.github/workflows/main.yml` runs on every push to `main` (and by hand via *workflow_dispatch*): `pnpm install --frozen-lockfile`, `pnpm build`, then publishes `dist/` to GitHub Pages. Vite's base path and the `BrowserRouter` basename come from the environment so the app works under the Pages sub-path. `dev` is not deployed.
