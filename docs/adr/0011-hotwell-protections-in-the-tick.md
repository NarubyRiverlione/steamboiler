# Hotwell protections live in the tick; the working band is operator policy

The hotwell level has two tiers. **Protections** are plant behaviour, enforced in `CondenserTick` whatever the operator does: below 10% (`HotwellLowLow`) the condensation pump trips, and from 95% (`HotwellHighHigh`) the reject is forced fully open. The **working band** is operator policy in `loop-operator.ts`: makeup and reject are shut between 55% and 75% and open in proportion to the distance outside it, fully open 15 points beyond an edge (`HotwellRamp`). The normal level is 70% ([ADR 0009](0009-hotwell-sized-from-condensate-flow.md)); the band contains it but is not centred on it. Decided in #52; the research is [2026-11-hotwell-level-control.md](../research/2026-11-hotwell-level-control.md) (all sources UNVERIFIED, the pattern only).

The owner's 10% and 95% were first proposed as working setpoints. Real plants regulate near normal level (60 to 70% of height) and keep the pump trip in the bottom 10 to 20%, so 10% and 95% became the protection tier and a band was put between them.

- **Low-low trip:** the pump valve is shut, `condensationPumpTripped` is set and nothing is returned. The reducer refuses to open the pump while the level is below low-low; closing is always allowed. The flag clears on the next successful opening. Same pattern as [ADR 0003](0003-turbine-trip-on-vacuum-limit.md), and no separate restart level for the same reason: after a trip the pump stays shut until the operator acts.
- **Overfill clamp:** stateless. While the level is at or above 95% the tick treats the reject valve as fully open; the stored position stays as set. Nothing latches and no release level is needed, because the operator's reject is already fully open from 90%. The research's "limit bypass steam" is not done: it is unsourced and the room cap already stops condensation at a full hotwell.
- **Bands are on level** (volume fraction), as an operator reads it. Level drifts with the hotwell temperature ([ADR 0007](0007-water-state-is-mass-in-kg.md)); that is real plant behaviour.
- **Proportional valves**, not on/off with hysteresis. The valves move at most 50 L/s, so the cure for the churn is the wider band, not the valve style; proportional also removes the hysteresis state from the operator.

## Considered options

- **10% and 95% as working setpoints:** rejected. The level would wander 85 points before anything reacted, the pump would run into cavitation before makeup helped, and 95% is a brim-full hotwell with flooded tubes.
- **Everything in the operator:** rejected. A trip or clamp that the operator can leave out is not a protection; scenarios and the app must get the same behaviour.
- **Alarms at 25% and 85%:** built in #59 as two rows of the annunciator list (`alarms.ts`), derived from the level with no state, deadband or latch in the sim (the tile latches in the UI, #116): low below `HotwellLow` (25%), high from `HotwellHigh` (85%). The tick is unchanged.
- **Enlarging the hotwell, a deaerator-driven condensate trim, closing the condenser steam inlet on high-high:** out of scope. #53 already sized the hotwell, the deaerator of #119 ([ADR 0036](0036-deaerator-is-a-steam-heated-tank.md)) sits after the hotwell and changes none of its protections, and the steam-inlet claim is unverified.

## Consequences

- A scenario that runs the condensation pump with no operator can drain the hotwell below 10%; the pump then stays tripped and the boiler gets no feedwater. Scenarios must hold the hotwell and reopen the pump after a trip, as they must pull vacuum before opening the turbine valve ([ADR 0003](0003-turbine-trip-on-vacuum-limit.md)).
- `bypass-loop`: the level settles inside the band (within a small proportional offset past the upper edge) and makeup and reject are occasional, where on/off with hysteresis swung the level between 53% and 99.96% with reject open in 39% of the samples. Current figures: [headless-runner.md](../dev/headless-runner.md), `pnpm sim bypass-loop`.
- The tick sets the trip flag whenever the level is below low-low, also at a cold start with a near-empty hotwell and a pump that was never open. The flag then only means "the level is below low-low and the operator has not reopened the pump yet".
- `CondenserState` gains `condensationPumpTripped`.
- The boiler feed pump (#112) follows the same rule for the deaerator: `DeaeratorTick` trips it below the 12% low-low (valve shut, `feedPumpTripped` set), the reducer refuses to open it there, and an opening clears the flag.
