# The boiler is one lumped vessel, not a drum with risers and downcomers

The boiler is modelled as a single vessel: one fixed volume shared by water and saturated steam, and one temperature for the water and the drum and tube steel. Its volume and steel mass are sized from a real drum boiler (steam drum plus waterwall tubes and downcomers, [design-basis.md](../plant/design-basis.md)), but its behaviour is that of one pot. The water loop around it is closed. The documentation says so plainly ([boiler.md](../plant/boiler.md#what-the-model-is-not)). Decided by the owner, without a ticket, after asking whether the sim models the real tube-and-drum design; recording a choice already built, not a change.

## Considered options

- **A drum with risers and downcomers:** a steam drum and a lower drum, heated risers in the furnace and unheated downcomers, with natural circulation driven by the density difference. It would give swell and shrink, a drum level in mm, and riser steam quality. Rejected for now: it adds several states (drum level, riser void fraction, circulation flow), correlations that need sources, and a stiffer tick, while the operator's tasks (heat up at the limit, hold pressure with gas, keep the level, run the loop) work on the lumped model.
- **One lumped vessel (chosen):** energy and mass balances on one volume, pressure from saturation ([ADR 0001](0001-boiler-pressure-follows-saturation.md)), level from mass and specific volume ([ADR 0007](0007-water-state-is-mass-in-kg.md)), one lumped temperature ([ADR 0006](0006-heating-rate-alarm-only.md)).

## Consequences

- No swell and shrink: opening the steam valve lowers the level only through boiling off, never with the sudden rise a real drum shows. Level control is easier than in a real plant.
- The level is a volume fraction of the whole boiler, not a drum level, so level setpoints and trips (the burner low-low level of [ADR 0017](0017-burner-trips-on-low-water-level.md)) have no direct real-plant equivalent and stay UNVERIFIED.
- The steam space is the total minus the water, larger than a real drum's upper half ([design-basis.md](../plant/design-basis.md)).
- Thermal stress needs a separate metal temperature, which this model does not have. The superheater of #113 ([ADR 0044](0044-superheater-with-spray-attemperator.md)) adds one lag for the steam temperature, with the tube metal in it, outside the vessel: this ADR still holds.
- Splitting the boiler later is a new ADR that supersedes this one, and a ticket.
