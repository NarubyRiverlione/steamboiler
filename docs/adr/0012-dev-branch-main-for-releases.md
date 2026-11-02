# `dev` is the working branch; `main` holds milestone releases

Until now all work was committed straight to `main`. A GitHub Actions workflow now builds the app and publishes it to GitHub Pages on every push to `main`, so a commit to `main` is a public release. Day-to-day work therefore moves to `dev`, and `main` only receives a merge of `dev` when the owner explicitly calls a milestone release. How to work with it: [branching.md](../dev/branching.md).

## Considered options

- **Keep committing to `main`:** rejected. Every half-finished step would go live on the Pages site.
- **Deploy from a separate release branch or from tags, keep working on `main`:** rejected. `main` as the released state is the GitHub default and what the workflow already targets.
- **Git-flow with release and hotfix branches:** rejected. One owner, no parallel release lines; the overhead buys nothing.

## Consequences

- Agents commit to `dev` (or a ticket branch off it) and never to `main` without an explicit instruction for that release.
- The Pages site lags `dev` until the next release.
- `dev` must be pushed to `origin` to be shared or backed up.
