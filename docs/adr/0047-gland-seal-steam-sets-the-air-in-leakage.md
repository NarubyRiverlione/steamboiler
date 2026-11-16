# Gland seal steam sets the air in-leakage

**Status: accepted.** Decided in the #147 grilling. Amends [ADR 0035](0035-condenser-pressure-is-vapour-plus-air.md), whose single constant in-leakage becomes two rates selected by the gland seal. Built in #147.

## The decision

- **A switch and a flag.** Gland seal steam is an operator on/off switch (a latching control, [ADR 0039](0039-latching-controls-are-turn-switches.md)). The seal is a state flag: sealed while the steam is on, unsealed otherwise. No steam valve, no seal pressure, no lag.
- **Two leak rates, no lag.** The air in-leakage is the sealed residual rate (`AirLeakRate` today, 0.0022 kg/s) while sealed, and a sourced, larger open-gland rate while unsealed. The leak follows the flag at once. Both rates are sourced in a research note; an unsourced figure is marked UNVERIFIED and recorded in `design-basis.md` as a deliberate choice, never inflated to force a stall. The oversized air pump ([ADR 0035](0035-condenser-pressure-is-vapour-plus-air.md)) is not a reason to inflate the leak: the open-gland leak need only exceed what the SJAE alone holds at the design vacuum.
- **The rotor must turn.** Gland steam is admitted only while the rotor turns: the turning gear engaged ([#146](https://github.com/NarubyRiverlione/steamboiler/issues/146)) or rpm above the gear speed (`CstTurningGear.Rpm`). Steam on a stationary rotor bows it. The admission is refused silently otherwise. If the rotor stops turning while the steam is on, the steam is shut off and the seal is lost. Turning gear alone is not the condition: the gear throws itself out when steam rolls the rotor ([ADR 0051](0051-turning-gear-holds-the-stopped-rotor-and-blocks-the-valve.md)), and the turbine runs on gland steam afterwards. The threshold is the gear speed, not the 20 rpm standstill threshold: the gear throws out just above gear speed, and a threshold at 20 rpm would shut the steam off between the two during the roll.
- **A small boiler draw, returned to the hotwell.** The gland steam is a fixed, sourced flow taken from the boiler and returned to the hotwell through the gland condenser, so the water invariant holds.
- **Start state.** The Cold state starts with gland steam off. Every scenario that starts hot or running sets it on explicitly, so their vacuum and snapshots do not change by accident.

## Considered options

- **Condition on the gear only (the ticket's first wording):** rejected. The glands would lose their seal exactly when the turbine rolls.
- **A larger open-gland leak that stalls even the oversized pump:** rejected by the realism rule. It needs a leak hundreds of times the sourced value.
- **A gland steam valve and a seal pressure:** rejected for now. The ticket needs sealed or unsealed; a seal pressure has no source.
- **A lag on the seal:** rejected. A time constant with no source.

## Out of scope

- Losing the seal on a turbine trip (the vacuum breaker and lost gland steam of a real trip): a follow-up ticket.
- The board UI for the switch.
