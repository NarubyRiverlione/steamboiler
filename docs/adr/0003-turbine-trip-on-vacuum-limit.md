# The turbine valve trips above the vacuum limit

The turbine valve may only be open, or be opened, while condenser pressure is at or below the **vacuum limit**: one named condenser constant, with its value and source recorded in [design-basis.md](../plant/design-basis.md). If pressure rises above it while the valve is open, a **turbine trip** closes the valve fully, switches hold mode off and clears the PID memory. The operator can always close the valve by hand; reopening is refused until the vacuum is back. Decided in #37.

## Considered options

- **Block opening only:** refuse a larger valve position above the limit, but leave an open valve where it is. Simpler, but the turbine then keeps sending exhaust into a condenser that cannot take it, and safety depends on the operator noticing in time.
- **Turbine trip (chosen):** what real low-vacuum protection does. The exhaust has nowhere to go without vacuum, so the turbine stops taking steam.
- **A window around the old intake bell curve (60–100 mbar):** rejected. #20 takes the bell curve out of the condenser intake, and nothing in a real plant refuses a vacuum for being too deep. The limit is one-sided.
- **A separate start-up permissive, stricter than the trip point:** rejected for now. After a trip the valve stays shut until the operator acts, so one threshold cannot make it keep tripping and reopening, and a second value would be one more number to justify.

## Consequences

- The limit applies wherever the valve position changes: the operator action and the hold-mode PID in the tick. Hold mode cannot get around it.
- Hold mode turns off on a trip, so the PID cannot restart the turbine on its own once vacuum recovers. Its memory is cleared, so turning it back on starts without a wound-up error.
- `TurbineState` carries a trip flag that the turbine panel shows. The flag is set by a trip and cleared by the next successful opening.
- Scenarios have to pull vacuum before they open the turbine valve: SJAE enabled and its valve opened once the boiler is above the main steam valve minimum pressure.
- The bypass valve and the generator breaker are not affected.
