# The heating-rate limit is an alarm at the real 100 K/h on one lumped boiler temperature

A real drum may heat at about 100 K/h before thermal stress in its thick walls becomes a risk, so a cold start takes 4 to 8 hours. The simulator keeps the same lesson, ramp the gas instead of opening it fully, at the real pace: the limit is 100 K/h (0.028 K/s), and the cold start to 165 bar takes about 6 hours of plant time. Decided in #13 with the limit compressed to 0.4 K/s (24 K/min, about 14 times the real one) so a cold start took 15 minutes; playback speed (#78, [ADR 0034](0034-playback-speed-is-ticks-per-second.md)) lets the player watch the long heat-up faster (an active heating-rate alarm drops it to 1x), so #103 restored the real limit.

The water and about 100 t of drum and tube steel share one temperature; heat loss to the surroundings is `UA · (T − T_ambient)`, with UA set by 0.5 MW at design temperature. The heating rate is that temperature's rise, smoothed with a 30 s time constant. Over the limit the boiler panel and the report show an alarm. Nothing else happens.

## Considered options

- **Slow the physics instead (smaller burner, larger heat capacity):** violates the realism rule; the sizing check found `MaxGasFlow` right for a 200 MWe unit, and full gas without care should still be possible and visibly wrong.
- **Limit the gas automatically at the limit:** takes the lesson away from the operator; gas control UX is #15.
- **Trip the burner over the limit:** trips belong together in #33.
- **A separate, lagging metal temperature:** the true source of thermal stress, but it adds a state and a heat-transfer coefficient that nothing needs yet; a later ticket if the stress alarm needs it.
- **A true 30 s moving average:** needs about 300 past temperatures in the state and every snapshot; an exponential moving average with a 30 s time constant is one number and reads the same on a gauge.
- **Alarm only, one lumped temperature, EMA (chosen; the limit was time-compressed until #103).**

## Consequences

- The limit is no longer a departure and is not in the register as one (`docs/plant/design-basis.md`); the real limit does not depend on the boiler volume.
- The metal stretches heat-up by about a quarter; the limit is what teaches the ramp.
- The metal never empties: a boiler vented or drained dry with gas on heats its steel to the critical-point clamp. Burner protection on low level is #33.
- The `heat-up` scenario ramps under the limit with a feedback operator; the at-pressure snapshot moved to `heat-to-msv`.
