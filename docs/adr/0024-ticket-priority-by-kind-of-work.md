# Ticket priority says what kind of work a ticket is

Only `P1` ("do first") and `P4` ("a parked idea") had a written meaning, so `P2` and `P3` were set by feel and alike tickets ended up apart: the shutdown scenario was `P3`, the hot-start scenario `P4`. The `P` label now says what kind of work a ticket is, and because `pnpm roadmap` sorts by it, that kind sets the work order:

- `P1`: broken. A crash, a sim that can't run or can't be trusted, or a blocked scenario or deploy.
- `P2`: realism within the current scope. Something the plant already has behaves or calculates wrongly.
- `P3`: experience and project health. Improves what exists: scenarios on the existing plant, tests, CI, tooling. Protections and alarms the owner promoted also get this label.
- `P4`: parked. A scope expansion (a new component, system, protection, alarm or feature) or a nice-to-have the owner set aside.
- `P5`: UI and UX. Anything that only changes the app's presentation, a new UI-only feature included. Not parked: these tickets are triaged and worked, after everything else.

The line between `P2` and `P4` is one test: does the ticket correct something the plant already has, or add something it doesn't have yet? Bugs are sorted by effect: broken is `P1`, wrong physics `P2`, cosmetic `P5`. Promoting a `P4` is the owner's decision to widen the scope; the ticket then gets the label of what it is.

A ticket with a sim part and a UI part gets the label of its sim part. When the UI part can wait, it is split off as a `P5` ticket: the time control (#78, #86) is an example.

## Considered options

- **Priority as urgency, set per ticket:** rejected. It needs a fresh judgement for every ticket, which is what left the labels inconsistent.
- **Tooling in a class of its own:** rejected. A separate label adds a sort position that has no reason to sit anywhere but next to `P3`.
- **UI inside `P3`:** rejected. UI work then sits between the realism and project-health tickets, while the redo changes no physics and blocks nothing, so it can wait for all of them.
- **Protections and alarms as `P2`, because a real plant has them:** rejected. They add behaviour the sim doesn't have yet, so they fail the test above.

## Consequences

- Realism goes before experience in the work order, in line with the realism rule, and UI goes last.
- A tooling ticket is not urgent by label. When other work really needs it, the roadmap's inherited priority pulls it forward.
- `P1` is empty most of the time.
- A ready `P5` ticket is picked before a parked `P4`, because a `P4` stays `needs-triage`.
