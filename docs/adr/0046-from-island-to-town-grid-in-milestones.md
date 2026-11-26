# From island to the town grid in milestones

**Status: accepted.** Sets the direction for the `electrical` theme; replaces the parked #108. Amends the direction of [ADR 0027](0027-generator-load-is-a-resisting-torque.md), whose decisions stay in force until M1 rewrites them.

The plant runs as an island today: with the breaker closed, the load is a resisting torque on a free shaft and the speed PID follows the sag (ADR 0027). The end goal is a plant that serves a **town grid**: a town whose demand follows a day-night cycle, fed by the plant and by the rest of the grid. The way there is a ladder of milestones, each a set of small tickets tracked as a GitHub milestone.

## Decisions

- **Town grid:** the plant feeds a town grid of finite size, with a demand of its own and the **rest of the grid** as one aggregate supplier that is always there. Other suppliers are not modelled one by one, so there is always a live grid to sync to.
- **Island** from now on means **house load operation**: the generator breaker (the tie to the grid) open and the unit aux breaker closed, the generator feeding only the plant's own pumps.
- **Ladder:**
  - **M1, on the grid with auto-sync:** an auto-sync turn switch trims the speed and closes the breaker itself; the closed breaker holds the speed (a stiff grid); the load setpoint drives the valve through a MW controller; reverse power (the generator motoring) past a delay trips the turbine and opens the breaker; the vacuum and overspeed trips are re-checked (with the speed held, overspeed can only follow a breaker opening, a load rejection). No basic load on close: #139 was closed as not planned, the auxiliary bus of M2 replaces it.
  - **M2, the plant's own power:** auxiliary load and net output; the auxiliary bus fed by the grid supply, the unit aux breaker or the diesel ([ADR 0053](0053-the-auxiliary-bus-is-fed-by-the-grid-or-the-generator.md)); the onsite diesel generator and a dark start from it (#169, decisions in ADR 0053); house load operation (#140, #141, #142). The six rated powers of #140 are estimated in [the research note](../research/2026-11-auxiliary-power.md), with a source only where one was found (the turning gear motor).
  - **M3, the town grid:** finite grid inertia; the frequency follows the balance of demand against the plant plus the rest of the grid; governor droop.
  - **M4, manual sync:** a synchroscope with phase; auto-sync stays as the alternative.
  - **M5, operating for the town:** the load set from frequency and demand, by the operator or later automatically.
  - **M6, day-night cycle:** a 24-hour demand curve.
  - **M7, satisfaction and growth:** a satisfaction score from how well the town is served (the frequency kept in its band, all demand served with no load shedding); demand growing over time, so the plant's sizing becomes the operator's problem.
  - **Side track, any time after M2:** vital bus, safety bus and UPS (#143, [ADR 0055](0055-the-vital-bus-and-the-safety-bus.md), #144).
- **Stiff grid before the moving frequency:** M1 holds the speed, so the load controller and the protections are built against a fixed frequency first.
- **Auto-sync before manual sync:** manual sync only gets interesting with a moving frequency (M3).
- **Reverse power trips:** a generator that motors with too little steam overheats the last turbine stages by windage; past a short delay it trips the turbine and opens the breaker. The delay and threshold come from a research note in M1. Real plants also use it the other way round (a sequential trip): after a turbine trip the breaker waits for reverse power before it opens, so the unloaded shaft cannot overspeed; the M1 ticket decides whether the sim follows that order.

## Considered options

- **One unit on a big grid (infinite bus, a dispatcher's setpoint):** rejected as the end state. The plant's actions would not move the grid, which leaves no town to serve and no satisfaction to earn. It survives as M1's stiff-grid step.
- **Keeping today's island model and adding demand to it:** rejected. There is no grid to sync to, and the operator could never go off-grid on purpose.
- **Named suppliers (solar, wind):** deferred. A named solar supplier leaves no grid after sunset; the aggregate avoids that trap.

## Consequences

- M1 rewrites ADR 0027 in place: the speed is held with the breaker closed, and the MW controller replaces the speed PID while synchronised. Goldens and snapshots move.
- `GLOSSARY.md` terms (Town grid, Rest of the grid, House load operation, Island, Auto-sync, Reverse power) land with the tickets that build them.
- #108 closes into this ADR. #139 (basic load on close) is closed as not planned, replaced by the auxiliary bus (ADR 0053); #141 loses its auto-open-on-speed case.
- The diesel generator is sized with the headless runner from the auxiliary load at start-up flows; any oversizing is recorded in [design-basis.md](../plant/design-basis.md).
