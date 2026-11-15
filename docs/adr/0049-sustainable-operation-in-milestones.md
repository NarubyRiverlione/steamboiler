# Sustainable operation in milestones

**Status: proposed.** A brainstorm for a new epic, written down so it can rest; nothing here is decided. No milestones or tickets until it is accepted. Touches [ADR 0006](0006-heating-rate-alarm-only.md), [ADR 0046](0046-from-island-to-town-grid-in-milestones.md) (M7) and [ADR 0047](0047-first-public-release-on-itch-io.md) (saving deferred); none of them changes while this is proposed.

The plant forgives everything that does not trip it. A heating rate over the limit is an alarm and "nothing else happens" (ADR 0006); the exhaust runs 17% wet where a real plant loses last-stage blade life; load above rated "has no consequence" (`design-basis.md`); a hot start with a steam-to-metal mismatch will cost nothing ([ADR 0048](0048-from-roll-on-demand-to-a-real-cold-start-in-milestones.md)). The player's only goal is to reach sync (ADR 0047).

The idea is **sustainable operation**: the player runs one plant for a long time, over many sessions, and is judged on how well it is kept and how well it pays, not on one start. Electricity sold pays for the fuel, the wear and the repairs.

## Direction (proposed)

- **Wear is honest life consumption, not gameplay damage.** Running in the yellow uses up a sourced share of a component's life, as real plants count it (a turbine stress evaluator counts rotor life per start). Small excursions cost money, not breakdowns; only gross mistakes (water into the turbine, a dry boiler) break things at once. Speeding up wear to fit a session would break the realism rule.
- **The economy turns it into one account:**
  - fuel cost from the gas flow;
  - income from the net MWh sold (generator less the plant's own pumps), which needs a grid to sell to (Electrical M1) and the auxiliary load (Electrical M2);
  - life consumed charged as maintenance;
  - gross damage charged as repair cost plus outage time, with nothing sold.
  Prices, rates and costs come from a research note, never tuned to balance the game.
- **Things that are free today get a price:** gas burned into the bypass while the casing warms, a forgotten prewarm, a trip and its restart, running above rated.
- **Long-term play needs save and load:** one plant carries its history across sessions.

## Ladder (draft)

- **M1, save and load:** the plant state and its history saved and resumed. The full state is plain JSON already: the presets load committed snapshots (`sim/snapshots/`, `src/context/startPresets.ts`), a tick depends only on its input state, and a loaded snapshot is checked against the current state shape (`shapeErrors`). A simple version could come earlier as a release rung.
- **M2, the operating record:** every limit that is alarm-only today logs its excursions (how long, how far over). #102's event log needs the same.
- **M3, the account:** fuel cost now; income once Electrical M1 exists.
- **M4, wear as cost:** sourced life consumption per component: drum (heating rate), rotor (mismatch), last-stage blades (wet exhaust), superheater tubes (overtemperature), deaerator corrosion (#114).
- **M5, gross damage:** forced outage, repair time and repair cost.
- **M6, sustainability as the goal:** the score over a long run; scenario goals building on ADR 0047's "Get a goal".

## Open questions

1. **Is money the only score?** (A, recommended) one balance, the town's unserved demand and frequency out of band as penalties in money, so Electrical M7's satisfaction becomes part of the account; or (B) money next to a separate satisfaction score, two meters to balance.
2. **Where does the town's satisfaction live?** It stays in Electrical M7 (it needs the town grid) and feeds this epic, or it moves here.
3. **Between sessions:** frozen (the plant pauses on save and resumes exactly; leaning this way), running on while away (needs an autopilot; leaning against), or a planned outage as the session break, where the time away pays for an overhaul.
4. **Save compatibility:** every ticket in the three epics changes the state shape, so an old save breaks after an update. A schema version with a migration per change (a step in every state-changing ticket); breakage accepted in early access with a clear message, migrations from 1.0; or saves that load only in their own build (not possible on itch.io).
5. **Undoing mistakes:** reloading an old save wipes a trip and its repair bill. Autosave only (ironman) as the scored mode with free saves in a practice mode, or a score that counts reloads.
6. **Where saves live:** browser storage with a slot per plant, plus export and import of a save file as a backup (browser storage can be wiped).
7. **Theme:** a new theme label (for example `operation`) in `THEMES` and `docs/agents/issue-tracker.md`, or the work spread over existing themes.

## Considered options

- **Gameplay damage bars that fill within a session:** set aside; they need wear sped up past the sourced rates (realism rule).
- **A score with no economy:** set aside; the account is what gives wear, fuel and outages one measure.

## Consequences (if accepted)

- ADR 0047's deferred "Saving the game" is taken up here, or by an earlier release rung.
- ADR 0006 gains a cost for the heating rate: its "nothing else happens" ends with M4.
- ADR 0046 M7 is redrawn depending on open questions 1 and 2.
- #114's damage model becomes part of M4; #102 shares the operating record of M2.
- GitHub milestones, the theme label and the `GLOSSARY.md` terms (Operating record, Life consumption, Forced outage, and the account's terms) come with acceptance and the tickets that build them.
