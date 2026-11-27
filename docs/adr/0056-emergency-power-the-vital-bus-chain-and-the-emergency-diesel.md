# Emergency power: the vital bus chain and the emergency diesel

**Status: accepted.** Decided with the owner after #143 and #190. Replaces parts of [ADR 0055](0055-the-vital-bus-and-the-safety-bus.md) (the Vital bus equals the Auxiliary bus; the Safety bus is fed from the Auxiliary bus; a manual battery breaker; four board states) and the diesel paragraph of [ADR 0053](0053-the-auxiliary-bus-is-fed-by-the-grid-or-the-generator.md) once #196, #198 and #199 land; each ticket edits 0055 and 0053 in place in its own commits. #196 has landed (the chain, the derived battery breaker, three board states, the Emergency power page): 0055 and 0053 are edited in place for it; #198 and #199 follow.

The point of a UPS is an uninterrupted bus, and a real plant's emergency power works one way: **the changeover to the emergency source is automatic, the hand-back is manual.** An operator checks that the normal supply is sound, and that the emergency source is ready, before the plant is reconnected. The buses become a chain, with an emergency diesel beside the big one.

```
Normal:      Grid ─► Aux ─[Aux→Vital]─► Vital ─[Vital→Safety]─► Safety ◄─ UPS (charging)
Grid lost:   Aux dead, Aux→Vital opens, Vital dead, Safety on the UPS
EMY diesel:  EMY diesel ─[EMY breaker]─► Vital ─► Safety (UPS recharging); Aux stays dead
Island:      the big diesel feeds Aux; its cooling is a load on the Vital bus
```

## Decisions

- **The Vital bus is a real bus**, stored through its breakers, not derived from the Auxiliary bus. Live when the **Aux→Vital breaker** is closed and the Auxiliary bus is live, or when the **EMY breaker** is closed. It carries the controller controls, the LCD readouts, the annunciator and the big diesel's cooling.
- **Aux→Vital breaker** (`vitalFeedBreaker`): default closed; opens by itself on any tick where the Auxiliary bus is dead; closed only by the operator, only while the Auxiliary bus is live, and it needs control power. Closing it opens the EMY breaker on the same tick (a seamless swap, as the grid supply and unit aux in ADR 0053). The operator may open it by hand: with the EMY selector on ON that is a changeover test.
- **Vital→Safety breaker** (`safetyFeedBreaker`): default closed; opens by itself when the Vital bus is dead, and the **battery** takes the Safety bus in the same tick (no gap). Closed only by the operator, only while the Vital bus is live, and it **needs no control power**, so a flat battery stays recoverable. While the Vital bus is fed by the EMY diesel, closing is allowed only when the diesel is warmed up (**Ready to close**, an interlock; the command does nothing and the lamp says why, [ADR 0054](0054-status-by-lamps-not-text.md)); with the Auxiliary bus as source it is always ready. This breaker is the hand-back that gives the diesel time to reach speed and temperature.
- **The Battery breaker is derived** (closed = Vital→Safety open) and has no operator control. The manual battery breaker (`upsBreaker`) goes. The Safety bus is live when (Vital→Safety closed and the Vital bus live) or (the battery feeds and the charge is above 0).
- **UPS charge:** drains at the current rate whenever the battery feeds, i.e. whenever Vital→Safety is open, even with the Vital bus back; recharges at the current rate only while it is closed and the Vital bus is live. Forgetting the hand-back costs battery. **0% with the Vital bus dead ends the simulation.** With the Vital bus live and a flat battery the board is normal and the Safety bus dead; the Vital→Safety breaker is the way out.
- **The EMY diesel** (#198): a second `Diesel` instance on the Vital bus, with no rating and no overload (the Vital loads are not metered). A selector **OFF / AUTO / ON** (default AUTO): AUTO starts it when the Vital bus is dead and keeps it running until the operator moves the selector to OFF and back to AUTO, ON is the manual test run, OFF never starts it. The **EMY breaker** has no operator control: it closes by itself once the diesel runs and the Vital bus is dead. After the start time a fixed warm-up (a timer, no temperature model) lights Ready to close. Start and warm-up times come from a research note, sourced or UNVERIFIED, with the playable figures in `design-basis.md`.
- **The big diesel** (#169, #199) keeps its manual ON/OFF operation and gains the Vital bus as a prerequisite (its cooling fans and water, tbd): RUN does nothing while the Vital bus is dead, and it stops on that tick if the Vital bus dies. No temperature model; a stated simplification.
- **The principle applies to the UPS and the EMY diesel only.** The grid supply, unit aux and big diesel breakers stay manual.
- **Board states: normal, emergency, ended.** The dark board goes: a dead Safety bus with a dead Vital bus is the end of the game. Emergency stays "Vital bus dead, Safety bus live": the red lens (#197), no UPS strip, no annunciator. The UPS charge shows on the Emergency power page; the annunciator gets a tile **UPS on battery**.
- **Default start (new game):** the Auxiliary bus is grid supplied, both breakers closed, charge 100%, the EMY selector on AUTO, the big diesel off. Losing the grid is an exception (#200).
- **The Emergency power page** (#196, grown in #198 and #199) holds the two breakers, the UPS group, the EMY selector and lamps; the Diesel page gets the Cooling power lamp.

## Considered options

- **The Safety bus fed from the Vital bus with no breaker, and the Aux→Vital breaker as the hand-back:** rejected. The warm-up wait belongs between the Vital and Safety buses, where the diesel's readiness gates the load.
- **An essential-loads bus fed by the emergency diesel, separate from the Vital bus:** rejected. The Vital bus already is that set of loads.
- **Automatic hand-back to the grid or the Auxiliary bus:** rejected. Automatic only in an emergency.
- **A manual battery breaker (ADR 0055):** replaced. The UPS changes over by itself; the operator's job is the hand-back.

## Consequences

- `PowerPlantState` gains `vitalFeedBreaker`, `safetyFeedBreaker`, the EMY diesel state with its selector, and loses `upsBreaker`; snapshots are regenerated in #196.
- The local mechanical trips (#193) and the controller controls on a dead Vital bus (#188) get a case again, since the Safety or the Vital bus can be dead while the Auxiliary bus is live.
- `dark-start` becomes `island-start` (#199); two edge scenarios, `grid-loss` and `ups-flat`, are #200.
- A realism cost, recorded in `design-basis.md` as the tickets land: the UPS runs 30 minutes, the EMY diesel has no load model, and the big diesel stops at once without cooling.
