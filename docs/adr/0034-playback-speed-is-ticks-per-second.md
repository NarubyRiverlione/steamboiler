# Playback speed is ticks per wall-clock second, never DeltaTime

A cold start takes hours of plant time. The player watches it at a chosen playback speed (Pause, 1x, 10x, 60x) instead of waiting; the physics stays the same. Playback speed means ticks run per wall-clock second: 1x is 10 ticks per second (`1 / DeltaTime`), 60x is 600. `DeltaTime` stays 0.1 s at every speed. Decided in #78.

The simulated clock and the playback speed live in `SimulationState` (`src/context/SimulationReducer.ts`), around `PowerPlantState`, so snapshots do not change. The loop runs every `UpdateInterval` (50 ms) and asks `ticksDue` how many ticks the elapsed wall time earns, capped at `MaxTicksPerUpdate`; the batch is one `SIMULATE_TICKS` action and one render.

## Rules

- N ticks in a batch equal N single ticks, exactly. The batch stops on the tick where an alarm comes on.
- "Alarm" is every row of the annunciator's list in `src/navigation/alarms.ts`, the single source (`src/context/Alarms.ts` only reads it). Tiles added later (#62; #59 did the hotwell pair, #72 adds none) are one more row and drop the speed with no other change.
- An alarm that comes on drops the speed to 1x (a pause stays a pause) in the same reducer step. Acknowledging is the annunciator's (UI layer): while a tile flashes (set, not yet acknowledged) the selector refuses speeds above 1x. After ACK the tile is steady (latched until RESET, #116) and speeds are allowed again, even while the flag stays set.
- At the cap the plant runs slower than requested: the remainder is dropped, no tick is skipped. The cap was chosen by measurement (`pnpm test:perf`): 100 ticks take about 1.4 ms, and 60x needs 30 ticks per update, so 300 gives a 10x margin.
- A hidden tab runs nothing and resumes at the same speed with no catch-up. Pause does the same.
- Loading a preset (`LOAD_STATE`, #24) resets the clock to zero and the speed to 1x; the alarms of the loaded state are not new.

## Considered options

- **Scale `DeltaTime` with the speed:** rejected. It is the tempting wrong answer: the explicit integration steps get coarser, the physics changes with the speed (stability, the trips and the heating-rate smoothing), and the same operator actions would give different plants at 1x and 60x.
- **Time-compress the physics (bigger burner, relaxed limits):** rejected, the realism rule. The relaxed heating-rate limit of ADR 0006 is what this replaces; restoring it is a separate ticket.
- **Keep the clock in `PowerPlantState`:** rejected. Every snapshot and golden file would change for a UI value.
- **Playback speed in React state next to the reducer:** rejected. The drop to 1x must happen on the tick of the alarm, which only a single reducer step guarantees.
- **A second acknowledgement state in the simulation:** rejected. The annunciator already owns ACK; the speed selector reads its flashing tiles.

## Consequences

- The headless runner is unaffected: it dispatches single ticks and never sees a playback speed.
- Playback speed is not a departure from a real plant; `design-basis.md` says so. With the real heating-rate limit (#103) a cold start to 165 bar is about 6 h of plant time: 6 min at 60x, and the first heating-rate alarm drops it to 1x.
- The Graphs recorder (#36) samples by simulated time (`SimulationState.ticks`), not by render.
