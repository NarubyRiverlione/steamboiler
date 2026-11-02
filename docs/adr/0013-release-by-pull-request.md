# Releases reach `main` by pull request, gated by CI

[ADR 0012](0012-dev-branch-main-for-releases.md) made `main` the release branch, but nothing on GitHub stopped a direct push, and the release step was a local merge with tests run by hand. `main` now requires a pull request and a green `check` job (`.github/workflows/ci.yml`: `pnpm lint:ci` and `pnpm test`). Required approvals are 0: the owner is the only maintainer and GitHub does not let an author approve their own pull request. How to work with it: [branching.md](../dev/branching.md).

## Considered options

- **Local merge and push, tests by hand:** rejected. Easy to skip, and leaves no record of what went into a release.
- **1 required approval:** rejected. With one maintainer every release would need the admin bypass.
- **Run `pnpm lint` in CI:** rejected. It runs `eslint --fix`, which would pass by correcting the CI checkout; `lint:ci` runs eslint without `--fix`.
- **Enforce the rules for admins:** not done. The bypass stays as an escape hatch.

## Consequences

- A release is a `dev` → `main` pull request; its page records what shipped.
- CI also runs on every push to `dev`, so a red suite shows before release time.
- A failing test blocks the release until it is fixed. At adoption three `turbine-sync` tests already failed on `main` and `dev`.
