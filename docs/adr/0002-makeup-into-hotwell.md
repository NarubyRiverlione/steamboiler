# Makeup water enters at the hotwell; the boiler is fed only by the condensation pump

Water from outside the loop (**makeup**) enters the condenser hotwell, never the boiler. Excess hotwell water leaves through a **reject** valve. The boiler fill valve is gone: the boiler gets water only as **return** from the condensation pump, the way a real drum boiler gets its feedwater. The drain valve stays. Decided in #19, built in 5796c65.

## Considered options

- **Boiler fill valve (previous model):** cold water straight into the drum. Real plants don't do this. It also skips the condenser, so the operator can keep the boiler level without ever running the water loop.
- **Makeup into the hotwell (chosen):** matches real plants, where the hotwell has its own level control: makeup from a storage tank on low level, reject back to it on high level. The condensing steam heats the makeup water before it reaches the boiler.

## Consequences

- Boiler level is a feedwater control problem: the condensation pump valve holds it, and in scenarios the operator hook does (targets in [feedwater-loop.md](../plant/feedwater-loop.md)).
- Filling the boiler from empty goes through the hotwell and the condensation pump, so it needs that pump running.
- The loop has three boundary flows: makeup, reject and drain (the relief valve of #9 adds a fourth, see below). The water conservation invariant counts them through the `makeupTotal`, `rejectTotal` and `drainedTotal` totalizers. Any other change in total water is a model error (#10).
- The only vent is the relief valve (#9), a fourth boundary flow counted through a `ventedTotal` totalizer. The sim models no leaks or continuous blowdown. Realistic cycle losses (0.5–1.5% of steam flow) would be a separate, deliberate feature.
