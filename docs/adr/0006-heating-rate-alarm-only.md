# The heating-rate limit is a time-compressed alarm on one lumped boiler temperature

A real drum may heat at about 100 K/h before thermal stress in its thick walls becomes a risk, so a cold start takes 4 to 8 hours. The simulator keeps the same lesson, ramp the gas instead of opening it fully, at a pace a player can follow: the limit is 0.4 K/s (24 K/min, about 14 times the real one), which makes the cold start to 165 bar take about 15 minutes at the limit. Decided in #13. Playback speed (#78, [ADR 0026](0026-playback-speed-is-ticks-per-second.md)) now lets the player watch a long heat-up faster, and an active heating-rate alarm drops it to 1x; restoring the real limit is a separate ticket.

The water and about 100 t of drum and tube steel share one temperature; heat loss to the surroundings is `UA · (T − T_ambient)`, with UA set by 0.5 MW at design temperature. The heating rate is that temperature's rise, smoothed with a 30 s time constant. Over the limit the boiler panel and the report show an alarm. Nothing else happens.

## Considered options

- **Slow the physics instead (smaller burner, larger heat capacity):** violates the realism rule; the sizing check found `MaxGasFlow` right for a 200 MWe unit, and full gas without care should still be possible and visibly wrong.
- **Limit the gas automatically at the limit:** takes the lesson away from the operator; gas control UX is #15.
- **Trip the burner over the limit:** trips belong together in #33.
- **A separate, lagging metal temperature:** the true source of thermal stress, but it adds a state and a heat-transfer coefficient that nothing needs yet; a later ticket if the stress alarm needs it.
- **A true 30 s moving average:** needs about 300 past temperatures in the state and every snapshot; an exponential moving average with a 30 s time constant is one number and reads the same on a gauge.
- **Alarm only, time-compressed limit, one lumped temperature, EMA (chosen).**

## Consequences

- The 0.4 K/s limit is in the register of deliberate departures (`docs/plant/design-basis.md`). The boiler volume is reduced there too (50 m³ water against a realistic 100 m³); restoring it means rescaling the limit.
- The metal stretches heat-up by about a quarter; the limit is what teaches the ramp.
- The metal never empties: a boiler vented or drained dry with gas on heats its steel to the critical-point clamp. Burner protection on low level is #33.
- The `heat-up` scenario ramps at the limit with a feedback operator; the at-pressure snapshot moved to `heat-to-msv`.
