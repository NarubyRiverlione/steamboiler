# From roll on demand to a real cold start in milestones

**Status: accepted.** Sets the direction for the `turbine-aux` theme. Amends the direction of [ADR 0021](0021-turbine-runup-from-steam-power.md), [ADR 0035](0035-condenser-pressure-is-vapour-plus-air.md) and [ADR 0036](0036-deaerator-is-a-steam-heated-tank.md), whose decisions stay in force until the rung that rewrites them is built.

Today the turbine rolls whenever the vacuum is below the limit and the main steam valve is open: no oil, no turning gear, no gland seals, and a casing with no temperature. `turbine-runup` rolls at 163 bar with 540 °C steam into a casing that would be at 20 °C, a steam-to-metal mismatch of about 520 K that no real turbine accepts. The end goal is a **real cold start**: the operator brings up the turbine auxiliaries in their physical order, warms the casing, and rolls on steam that matches the metal. The way there is a ladder of milestones, each a set of small tickets tracked as a GitHub milestone.

## Decisions

- **Ladder:**
  - **M1, oil and gear:** a lube oil pump builds the header pressure; low oil pressure trips the running turbine; the turning gear turns the stopped rotor, needs oil pressure to engage, and the steam rolls the rotor off it: the turbine valve is refused only on a stopped rotor off the gear, and the gear throws itself out above the standstill speed (#145, #146, the roll-off built in #147; [ADR 0051](0051-turning-gear-holds-the-stopped-rotor-and-blocks-the-valve.md)).
  - **M2, auxiliary steam and sealed vacuum:** the auxiliary steam header (below), with the deaerator moved onto it; gland seal steam, built in #147 as a switch that takes its steam from the boiler (the header is not there yet: it moves onto the header with the header ticket); without it the open-gland air leak keeps the SJAE alone from holding the design vacuum, not above the vacuum limit ([ADR 0047](0047-gland-seal-steam-sets-the-air-in-leakage.md)).
  - **M3, warm metal:** one lumped casing metal temperature, heated by the steam through the casing and cooling toward ambient over hours after a stop; prewarming on the turning gear; the steam-to-metal mismatch as a permissive on the roll; the start class (cold, warm, hot) from the casing temperature, and a heat soak at the 2500 rpm run-up point.
  - **M4, the full start-up:** a hot restart after a trip. The cold start-up order (oil, gear, gland steam, vacuum, roll) is already pinned in the `turbine-runup` goal checks and the `start-up-order` edge scenario (#148, built before M3, without prewarming); the hot restart is out of scope there.
  - **Side track, any time after M3:** casing top-to-bottom temperature difference and rotor eccentricity (water induction, rotor bow) as blocks on the roll; the UI board follow-ups of the rungs.
- **Physical order:** oil, gear, gland steam, vacuum, prewarm, roll. Steam on the rotor (gland steam and prewarming) only with the gear turning, since steam on a stationary rotor bows it.
- **Auxiliary steam header, from the plant's own boiler:** the deaerator's let-down line (ADR 0036) grows into one header. A hand **master valve** at the boiler take-off, before the main steam valve, feeds it through a reducing station; with the master valve shut the header is dead. The header pressure sits above the deaerator's 3 bar. Each user has its own valve on the header:
  - **deaerator valve:** the existing let-down valve, still automatic on the 3 bar loop;
  - **gland steam valve:** a hand turn switch ([ADR 0039](0039-latching-controls-are-turn-switches.md)), refused unless the rotor turns (the gear engaged or the rotor above the standstill speed, `rotorTurns`; [ADR 0047](0047-gland-seal-steam-sets-the-air-in-leakage.md));
  - **prewarming valve:** a hand position knob; its opening sets how fast the casing heats, and too much steam rolls the rotor off the gear.
  The header passes steam only while the boiler pressure is above the header pressure, so when each user becomes available falls out of the physics, as for the deaerator today.
- **Main steam valve shut until working pressure:** the economic start-up of today stays. The prewarm comes from the header, not from the main steam line, so the operator can warm the casing during the boiler heat-up.
- **Playability without a shortcut:** the prewarm is mandatory, but it overlaps the heat-up. The boiler's saturation temperature climbs about 1 K/min over the 6 h heat-up, slower than a casing may heat, so a casing warmed along with the boiler adds no time. UNVERIFIED and in doubt: the header is fed with saturated drum steam, which throttled to a few bar is only about 150 to 180 °C, so the prewarm alone brings the casing to about the cold/warm boundary, well below the 540 °C steam at the roll; how much time the soak on main steam then adds is for the research note, and the take-off point may change. An operator who forgets it waits the prewarm out at working pressure, burning gas into the bypass. No casing mass or heating rate is reduced to make it shorter (realism rule).
- **Mismatch permissive, not a cold-casing refusal:** a cold casing is the normal state before a cold start, not a fault. The turbine valve is refused while the steam temperature is outside a band around the casing temperature; within the band it rolls, and Ramp up holds at 2500 rpm until the soak is done. The spray attemperator ([ADR 0044](0044-superheater-with-spray-attemperator.md)) is the operator's lever to bring the steam down toward the casing.
- **Figures from a research note:** header pressure, gland steam flow and residual leak, casing mass and heat transfer, allowed casing heating rate, mismatch band, start-class limits and soak criterion. The ranges found while planning (plant-specific, so only a start): cold below about 150 °C, warm 150 to 350 °C, hot above 350 °C of HP metal temperature; a mismatch of about 56 K (100 °F, GE) or steam no more than 50 K below the HP inner casing; a soak at about 2500 rpm. UNVERIFIED until the note is written.

## Considered options

- **A hard refusal below a casing temperature:** rejected. Real plants start from a cold casing; they gate on the mismatch and pace by the start class. A refusal also has no way out, since the casing only warms when steam reaches it.
- **Warming by the roll alone (a valve-open start):** real (a 518 MW unit rolls on about 200 °F steam), but rejected. It leaves the time on the gear without a purpose and needs the main steam valve open at low pressure.
- **Prewarming from a branch after the main steam valve, on the bypass flow:** rejected. With the main steam valve shut until working pressure, the prewarm could only start there and would add hours to the start-up.
- **An auxiliary boiler for the header:** rejected. A new plant item and a new utility to size, where the own boiler already feeds the deaerator.
- **One header valve only, or one valve per user only:** rejected for the mix. The master valve gives one start-up step that feeds all; the valves per user keep each step visible and leave the deaerator automatic.
- **A shorter casing warm-up for playability:** rejected by the realism rule; the overlap with the heat-up is meant to do the job (see open question 3).

## Open questions

Not decided yet; each is settled before the rung that needs it is drafted, and this ADR is edited in place.

1. **Mismatch permissive or hard refusal (M3).** The Decisions above follow the recommendation: a mismatch permissive with a heat soak (B), not a refusal below a casing temperature (A). The owner has not chosen between them.
2. **Gear and roll-off (M1, M3).** Settled in #147: the gear throws itself out once the steam drives the rotor above the standstill speed ([ADR 0051](0051-turning-gear-holds-the-stopped-rotor-and-blocks-the-valve.md)), at the roll and with too much prewarm steam alike.
3. **Take-off of the auxiliary steam header (M2, M3).** From the drum, as the let-down line today: the throttled steam is only about 150 to 180 °C, so the soak on main steam adds time, sized by the research note. Or after the superheater: hot enough to prewarm toward the roll, but with the main steam valve shut nothing flows through the superheater during the heat-up until the start-up vent and drains of #152 exist.
4. **Valve types (M2, M3).** Proposed, not decided: the gland steam valve as a turn switch, the prewarming valve as a position knob.

## Consequences

- M2 rewrites ADR 0035 in place: the constant air in-leakage becomes a leak that follows the gland seal state. The design-basis row "Constant air in-leakage, no gland seal or vacuum breaker leak" goes with it.
- M2 rewrites ADR 0036 in place: "there is no auxiliary steam header" becomes the header above. Steam still comes only from the plant. Every start-up scenario opens the master valve in its shared steps (`sim/scenarios/steps.ts`), the deaerator warm-up is measured again, and the goldens and snapshots move.
- M2 moves the vacuum draw from t = 0 to the heat-up: gland steam first, once the boiler has the header pressure.
- M2 adds an edge scenario with the master valve forgotten: the deaerator stays cold and the vacuum cannot be drawn.
- M3 amends ADR 0021: the mismatch permissive on the roll and the soak at 2500 rpm in Ramp up. The run-up goldens move.
- M1 adds the low oil pressure trip to the trip reset of [ADR 0043](0043-trip-reset.md).
- Tickets: #145 and #146 are built (M1); #147 replaced #146's valve block on the gear with the roll-off (ADR 0051); #146's out-of-scope note on metal temperature now points to M3. #147 was rewritten for M2 and built with the gland steam taken from the boiler; without it the SJAE alone cannot hold the design vacuum (ADR 0047). #148 was built on M1 and M2 as goal checks on `turbine-runup` plus the `start-up-order` edge scenario, without prewarming or a hot restart (M3, M4). The header and the M3 work are new tickets, drafted with their rung.
- Links to other themes, not blockers: the oil pump and gear motor are auxiliary loads for Electrical M2 (#141, [ADR 0046](0046-from-island-to-town-grid-in-milestones.md)); an emergency oil pump belongs to #159 and hangs on the safety bus ([ADR 0055](0055-the-vital-bus-and-the-safety-bus.md), #143); there is no shutdown scenario (#38 closed as not planned), so the coast-down onto the gear is covered within this ladder. The SJAE taking its motive steam from the header is an open question.
- `GLOSSARY.md` terms (Turning gear, Gland seal steam, Auxiliary steam header, Master valve, Prewarming, Steam-to-metal mismatch, Start class, Heat soak, Roll-off) land with the tickets that build them.
