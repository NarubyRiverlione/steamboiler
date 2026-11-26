# Planning a theme in milestones

How to plan a theme whose end goal is too big for a few tickets: the way the `electrical` theme was planned on 2026-11-15 ([ADR 0046](../adr/0046-from-island-to-town-grid-in-milestones.md)). Decisions go in an ADR, the rungs become GitHub milestones, the work stays small tickets. No wayfinder map issue and no `wayfinder:` decision tickets: an issue that holds decisions duplicates the ADRs.

Nothing lands on the tracker or in the repo until the owner agrees; the owner plans in writing, lets it rest, then builds.

## 1. Check the current order

- Read the theme's section of `ROADMAP.md` and every ticket body in it (`gh issue list --label <theme> --state all`).
- Read the ADRs and `docs/plant/` pages the tickets lean on.
- The roadmap order only follows blocked-by links. Check whether the tickets assume the same model: a ticket whose acceptance criteria hold only under today's model, while another ticket changes that model, is in the wrong place or needs a rewrite.
- Name what is missing: a step the goal needs that no ticket covers.

## 2. Brainstorm the ladder

- Start from the owner's end goal, then the smallest first step from today's plant.
- Lay out rungs **M0 (today) → M1 → … → Mn**: each rung one line on what it adds, and the existing tickets that slot in. Work that is off the main route is a **side track**.
- Settle one fork at a time, with a recommendation. When the owner is unsure, explain the options concretely: a table from the operator's chair (what happens when X), not abstract terms.
- When two rungs differ only in hidden mechanics, say so and offer to merge them or give the thinner one something visible to do.
- Expect the owner's own picture to differ from the options offered; adopt it and redraw the ladder.

## 3. Record it in one ADR

- One new ADR, "From <today> to <goal> in milestones":
  - **Decisions:** the ladder, plus the key choices and why (order of rungs, definitions that change).
  - **Considered options:** the rejected pictures, with the reason.
  - **Consequences:** which ADRs a rung will rewrite, which tickets close or change, which `GLOSSARY.md` terms are coming.
- Point the affected ADRs at it in their status line. Their decisions stay in force until the rung that rewrites them is built.
- Add the row to the ADR table in `docs/README.md`.
- Glossary terms land with the tickets that build them, not with the plan.
- Documentation-only, so it is committed straight on `dev` with no gate ([branching.md](../dev/branching.md)).

## 4. Create the GitHub milestones

- One milestone per rung, titled `<Theme> M<n> <name>` (the theme in the title keeps the numbers apart across themes), and one per side track (`<Theme> side track: <name>`). The description is one line on what the rung adds, plus the ADR number.
  ```sh
  gh api --method POST repos/NarubyRiverlione/steamboiler/milestones -f title="..." -f description="..."
  gh issue edit <n> --milestone "<title>"
  ```
- Assign the existing tickets. Milestones do not change `ROADMAP.md`; the theme label and the blocked-by links still order the work.

## 5. Keep, rewrite or close the existing tickets

- Keep well-specified tickets that still fit a rung; don't scrap settled decisions.
- Rewrite a ticket whose acceptance criteria assume the old model (note it in the ADR's Consequences, rewrite it while drafting its rung).
- Close an umbrella ticket the ADR replaces, with a comment that maps its questions to the rungs. Before closing, `git grep "#<n>" docs/adr` and update the ADRs that mention it. The owner may waive the CRAP report and test gates when no code changed.
- Run `pnpm roadmap` and commit `ROADMAP.md` on `dev`.

## 6. Draft the rung's tickets

- Draft the next rung's tickets in chat (what to build, acceptance criteria, blocked-by) for the owner to review and let rest.
- Only after the owner's OK: create them `needs-triage`, with the theme label, the milestone and blocked-by links, then regenerate the roadmap.

## 7. Hand off

- Before ending the session, check what was agreed only in chat and move it into the ADR (a decision) or a ticket (work).
- Push `dev`, so the milestone descriptions and closing comments link to a pushed ADR.
