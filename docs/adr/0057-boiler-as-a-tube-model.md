# The boiler becomes a tube model; the lumped boiler is frozen until then

**Status: proposed.** The owner's long-term plan, written down after the [review of 27 November 2026](../research/2026-11-review.md) so it can rest; the model itself is not decided. No milestone or tickets until it is accepted. Once accepted and built it supersedes [ADR 0019](0019-boiler-is-one-lumped-vessel.md) (the boiler is one lumped vessel), which stays in force until then and does not change while this is proposed.

The boiler is one pot: one volume shared by water and saturated steam, and one temperature for the water and about 100 t of steel (ADR 0019). That carries the energy, mass and pressure behaviour, but not the behaviour a real drum unit is run by: no swell and shrink, a level that is a share of the whole vessel instead of a drum level, level trips with no real-plant meaning (UNVERIFIED estimates, [ADR 0017](0017-burner-trips-on-low-water-level.md), [ADR 0041](0041-boiler-high-high-level-trips-feed-pump-and-turbine.md)), and no metal temperature for thermal stress ([ADR 0006](0006-heating-rate-alarm-only.md)). [real-plant-gaps.md](../plant/real-plant-gaps.md) rates the effect on behaviour as very large.

## Direction (proposed)

- **A tube model replaces the lumped vessel:** a steam drum with risers and downcomers, or a low-order model of one (below), with a drum level in mm, swell and shrink, and a metal temperature apart from the water.
- **The lumped boiler is frozen until then.** The boiler volume (100 m³ against about 200 m³ on a real unit, a reduction in the register of [design-basis.md](../plant/design-basis.md)) and the metal mass (100 t, unsourced, possibly 3 to 5 times low: an own estimate in the review, UNVERIFIED) stay as they are. The volume's playability reason went with #103, which paced the start-up by the real heating-rate limit; the tube model sets both figures again from a research note, so tuning them now would be lost work.
- **No new plant systems before its impact is seen.** The tube model moves the level, the pressure dynamics and the start-up, and every scenario and snapshot with them. Systems built before it would be tuned twice. Small fixes go on meanwhile (the review's ticket list).
- **Exception: the grid (Electrical M1, [ADR 0046](0046-from-island-to-town-grid-in-milestones.md)) goes ahead** (owner, 2026-11-27). It corrects physics that is wrong today in the state the player spends most time in: with the breaker closed the speed still sags under load and the breaker opens on a 2 rpm sag, where a grid holds the speed and a lack of steam only costs MW. It hardly touches the boiler model, and Electrical M3 to M7 build on it. Its goldens are retuned again once the tube model lands; the boiler-follow or turbine-follow control it brings is part of what the tube model is judged against.
- **The realism rule holds:** the volume, the steel mass and the tube geometry come from a research note on a drum boiler of this class (about 150 MWe, 165 bar), never from what makes the plant playable; playability stays with the utility sizing and the playback speed ([ADR 0034](0034-playback-speed-is-ticks-per-second.md)).

## Considered options

- **Keep the lumped vessel (ADR 0019 as it is):** the simplest, and enough for the operator's tasks of today. Set aside as the end state: level control stays easier than in a real plant, and the level trips and the heating-rate alarm keep no real meaning.
- **A full drum, risers and downcomers:** natural circulation from the density difference, riser steam quality, swell and shrink. The most faithful; several new states, correlations that need sources, and a stiffer tick (ADR 0019 rejected it for that).
- **A low-order drum model:** a model with about four states (drum level, riser quality, steam under the water, pressure) as published by Åström and Bell (UNVERIFIED: from memory, needs a research note) gives the level behaviour without every tube. The middle route named in [real-plant-gaps.md](../plant/real-plant-gaps.md).
- **Tune the lumped boiler now (restore 200 m³, raise the metal mass):** set aside by the owner; the tube model resets both.

## Open questions

1. **Which model:** a full drum, risers and downcomers, or a low-order model.
2. **The metal:** one metal temperature, or a drum wall and tubes apart, and whether it feeds a thermal-stress limit in place of the heating-rate alarm (ADR 0006).
3. **The level trips:** the burner low-low, the high level and the high-high trip move to a drum level in mm; from which sources.
4. **What else goes ahead:** the grid is the one exception so far; whether the casing metal of Turbine-aux M3 ([ADR 0048](0048-from-roll-on-demand-to-a-real-cold-start-in-milestones.md)), which hardly depends on the boiler model either, is a second.
5. **The cold fill:** [ADR 0018](0018-cold-fill-of-the-boiler.md) fills the drum low because the one lump shows the whole expansion as level; with tubes the waterwalls stay full and the swell shows in the drum, as the startup research says.

## Consequences (if accepted)

- ADR 0019 is superseded by this ADR once built; ADR 0017, 0018 and 0041 are edited in place for the drum level, and ADR 0006 if the metal takes over the stress.
- `design-basis.md` loses the boiler volume and boiler model rows of the register, or gets them again with the tube model's figures; `boiler.md` is rewritten.
- Every scenario and snapshot moves; the goldens are retuned.
- A research note comes first: drum and tube geometry, water and steel mass, and the chosen model's equations and figures.
- A GitHub milestone and tickets come with acceptance.
