# Parked

Nice-to-have ideas the owner has decided not to do soon. They are not work: they are not on the roadmap and no ticket
tracks them. Each entry keeps enough to write a ticket again. Picking one up means a new ticket (and an ADR when it
decides something); remove the entry in the same commit.

## Dev tooling

### Test gates enforced by hooks and CI (was #61)

The gates in [dev/branching.md](dev/branching.md) are run by hand today: lint and `pnpm test` before every merge. The
idea is to enforce them:

- a versioned pre-commit hook (e.g. `simple-git-hooks`) that runs `pnpm lint:ci` and `test:unit`;
- `ci.yml`: a push to `dev` runs lint, unit, golden and edge (edge reported, not required); a PR into `main` runs all
  of them, all required;
- possibly a versioned pre-push hook that runs golden and the crap report when `dev` is pushed.

Open question: should crap scores count unit-test coverage only? Scenarios run almost every branch of the core, so
today's coverage counts branches no test asserts on. Decide before making the crap report a failing check.

Parked because one developer runs the gate locally anyway, and the branch policy part (ADR 0014) is already in place.

### Orca orchestration prerequisites (was #154 and #155)

The prerequisites for automating the ticket workflow with Orca, detailed in
[agents/orchestrator.md](agents/orchestrator.md#prerequisites):

- **Deterministic picker:** `pnpm roadmap --next-ready --json` prints the ordered `ready-for-agent` tickets with no
  open blockers and no `in-progress` label, without rewriting `ROADMAP.md`; an empty list prints `[]` and exits 0. The
  ordering and filtering live in `scripts/roadmap-helpers.ts`, shared with the normal roadmap.
- **`in-progress` label:** the coordinator adds it on dispatch, `close-ticket` removes it; `ROADMAP.md` shows it in
  the Status column and never names an `in-progress` ticket as a theme's next. The GitHub label exists already.

Parked together with the orchestration plan itself.

## UI

### History graphs in the app (was #36 and #102)

Time-series charts of the plant's values (temperatures, pressures, flows, electric output) in the app, live, with a
synced crosshair across the charts and event marks (dashed lines for operator actions, shaded bands for relief lifts,
from an event log in the recorder).

Parked because the headless runner's HTML report ([dev/headless-runner.md](dev/headless-runner.md)) already gives
this for development and debugging, which is where it earns its value. For the operator in the app, the board's
readouts and alarms are the interface; graphs are not part of the UI/UX direction.

If it is ever built: the recorder samples by simulated time (`SimulationState.ticks`), not by render (ADR 0034), and
the history clears on `LOAD_STATE`. The event log could share the operating record of ADR 0049 M2.
