# The Return stops at a full boiler; no overflow

The **boiler feed pump's** delivery (#112; before it the condensation pump's Return) is the smallest of the pump flow, the water in the deaerator and the free liquid room in the boiler, all in kg: the room is `CstBoiler.TotalVolume` minus the boiler's volume, divided by the specific volume at the boiler temperature. What cannot be delivered stays in the deaerator, whose own room then limits the condensation pump's Return in the same way, and the water backs up to the hotwell. The boiler receives the feed in the same tick the deaerator gives it. Decided in #10, moved to the feed pump in #112.

## Considered options

- **Overflow out of the boiler:** a full boiler spills the excess. Real drum boilers have no overflow; a high drum level is a level-control and trip problem, not a spill path. It would also add a fourth boundary flow for a situation the operator should prevent.
- **Automatic reject of the excess:** the excess goes back to storage. That hides an operator error and moves water out of the loop without a valve being opened.
- **Delivery limited by the source and the room in the receiving vessel (chosen):** a pump cannot move water that is not there, nor push it into a full vessel. Water stays where it is, so the loop conserves it with no new boundary flow.

## Consequences

- Boiler water never exceeds `CstBoiler.TotalVolume`. High-level protection is a separate feature: the feed pump trips at 70% ([ADR 0041](0041-boiler-high-high-level-trips-feed-pump-and-turbine.md)).
- The capacity is the whole 100 m³ of liquid, so a full boiler has no steam space. Protecting against that is the high-high level trip's job ([ADR 0041](0041-boiler-high-high-level-trips-feed-pump-and-turbine.md)), not the Return's: it shuts the pump at 70%, so this room rule is the second line.
- `DeaeratorTick` takes the boiler's room as an input and reports the delivery of the feed pump; `CondenserTick` takes the deaerator's room and reports the Return actually delivered; `PowerPlantTick` adds exactly that, which removes the previous one-tick lag.
- Water is held as kg and the room is converted at the boiler temperature, so a hot boiler takes fewer kg for the same free volume ([ADR 0007](0007-water-state-is-mass-in-kg.md)). A full drum that then heats up passes `TotalVolume`, because mass is not clamped (#62).
- The sample invariant can only bound the Return by the pump capacity; that it never exceeds the hotwell is checked directly on `CondenserTick`.
