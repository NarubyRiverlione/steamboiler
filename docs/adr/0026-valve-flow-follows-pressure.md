# Valve flow follows boiler pressure; the main steam valve closes at low pressure

The bypass and the turbine valve pass `position × valve capacity × √(P·ρ) / √(P·ρ)rated`, with P the boiler pressure and ρ the saturated steam density at that pressure, never more than the steam mass held. The 200 kg/s valve capacity holds at the rating point, 165 bar (`CstTurbine.ValveRatingPressure`), so the flow at working pressure did not change. It is a rating, not a cap: a fully open valve passes about 210 kg/s at 171 bar and about 223 kg/s at 178 bar. When boiler pressure at the start of a tick is at or below `MainSteamValveMinimumPressure` (10 bar), the main steam valve closes and stays closed until the operator reopens it; reopening at or below 10 bar stays refused. Decided in #80.

## Considered options

- **Flow from position alone (the old model):** rejected. It passed 200 kg/s at 9.7 bar and went on taking water out of a 20 °C boiler with the gas off.
- **Linear flow, `position × capacity × P / P_rated`:** rejected. Simple, but a choked valve passes mass in proportion to √(P·ρ), and steam density is not linear in pressure over 10 to 178 bar.
- **Flow on the pressure difference to the condenser:** rejected. The valve stays choked until the condenser reaches about 55% of boiler pressure, and the condenser is under the 327 mbar vacuum limit, so across the operating range the flow depends on upstream pressure alone. It would add a model for nothing.
- **Cap the flow at the valve capacity above the rating point:** rejected. A valve has no such limit, and the pressure above 165 bar is real.
- **True saturation pressure below atmospheric, or a guard on the flash in `BoilerTick`:** rejected. `Boiler.pressure` stays clamped at atmospheric (ADR 0001), so a law on it alone still passes about 1.1 kg/s at 20 °C. The closure stops that flow long before, at 10 bar, without touching the boiler model.
- **Hysteresis or automatic reopening on the closure:** rejected. One threshold is enough: the valve stays shut until the operator acts, so it cannot chatter, and no new constant is needed.
- **A new alarm for the closure:** rejected. The "Opening not possible" indicator and the turbine trip indicator already tell the operator.

## Consequences

- Boiler loss, reported flow and condenser intake stay equal: only the mass per tick changes.
- `MaxSteamRemovalRate` keeps its value and its name; the SJAE's `steamFlowEffect` divides by it.
- The closure runs in `PowerPlantTick` before any steam is removed, so no steam leaves on the tick it closes. This is one tick earlier than the vacuum trip, whose closed valve takes effect on the steam path from the next tick.
- With the turbine valve open, the closure is a turbine trip like the vacuum trip of [ADR 0003](0003-turbine-trip-on-vacuum-limit.md): turbine valve to 0, speed mode to Free, PID integral cleared, trip indicator set. With the turbine valve shut only the main steam valve closes; no trip flag, and the speed mode stays.
- The free flash at ambient (water evaporating with no heat, because the ambient clamp keeps the latent heat out of `temperature`) stays in `BoilerTick` but can no longer be reached through a valve.
- `turbine-runup` keeps its 5% bypass: about 1.8 kg/s at 34 bar, 10 kg/s at working pressure. Less steam leaves while pressure builds, so working pressure comes at about 1410 s instead of 1500 s and the boiler level peaks at 64% instead of 59% before the hold brings it back. No limit is crossed; the PID gains stay.
- The `low-pressure-close` scenario is the first to draw steam with the gas off, so it is an expected failure of the invariant "natural cooldown stops steam generation", whose premise is wrong for a draw (#58).
