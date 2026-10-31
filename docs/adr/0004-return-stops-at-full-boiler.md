# The Return stops at a full boiler; no overflow

The condensation pump's **Return** is the smallest of the pump volume, the water in the hotwell and the free liquid room in the boiler (`CstBoiler.TotalVolume` minus its water). What cannot be returned stays in the hotwell. The boiler receives the Return in the same tick the hotwell gives it. Decided in #10.

## Considered options

- **Overflow out of the boiler:** a full boiler spills the excess. Real drum boilers have no overflow; a high drum level is a level-control and trip problem, not a spill path. It would also add a fourth boundary flow for a situation the operator should prevent.
- **Automatic reject of the excess:** the excess goes back to storage. That hides an operator error and moves water out of the loop without a valve being opened.
- **Return limited by hotwell and boiler room (chosen):** a pump cannot move water that is not there, nor push it into a full vessel. Water stays where it is, so the loop conserves it with no new boundary flow.

## Consequences

- Boiler water never exceeds `CstBoiler.TotalVolume`. The 30–70% level band and its trip are a separate feature (#33).
- The capacity is the whole 100 m³ of liquid, so a full boiler has no steam space. Protecting against that is #33's job, not the Return's.
- `CondenserTick` takes the boiler's room as an input and reports the Return actually delivered; `PowerPlantTick` adds exactly that, which removes the previous one-tick lag.
- Volumes count 1 L = 1 kg until #34 adds temperature-dependent density.
- The sample invariant can only bound the Return by the pump capacity; that it never exceeds the hotwell is checked directly on `CondenserTick`.
